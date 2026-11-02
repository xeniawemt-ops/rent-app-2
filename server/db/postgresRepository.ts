import { getDbPool, isDbConnected } from './postgres';
import {
  DBUser,
  DBCustomerProfile,
  DBOwnerProfile,
  DBProperty,
  DBPropertyUnit,
  DBPropertyRoom,
  DBBedInventoryItem,
  DBPgHostelMetadata,
  PropertyFilters,
  DBApplication,
  DBRentalAgreement,
  DBReview,
  DBPayment,
  DBRefundRecord,
  DBRejectionReport,
  DBConsentLog,
  DBAuditLog,
  DBNotificationDispatch,
  DBAgency,
  DBBrokerMembership,
  DBStaffMembership,
  DBPropertyAuthorization,
} from './database';

/**
 * PostgreSQL Database Repository.
 * Executes genuine parameterized SQL statements with ACID transactions,
 * relational constraints, ownership checks, and role enforcement.
 * If the PostgreSQL database is not connected, it raises clear operational errors
 * instead of fabricating data writes.
 */
export class PostgresRepository {
  /**
   * Helper: verify pool connectivity or throw clear operational exception
   */
  private getClient() {
    const pool = getDbPool();
    if (!pool || !isDbConnected()) {
      throw new Error(
        '503_DATABASE_UNAVAILABLE: PostgreSQL database is not currently connected. Please configure a valid DATABASE_URL and ensure the PostgreSQL instance is running.'
      );
    }
    return pool;
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  public async findUserByEmail(emailOrUsername: string): Promise<DBUser | undefined> {
    const pool = this.getClient();
    const clean = emailOrUsername.trim().toLowerCase();
    const query = `
      SELECT id, email, password_hash as "passwordHash", role, full_name as "fullName",
             phone, is_verified as "isVerified", created_at as "createdAt"
      FROM users
      WHERE LOWER(email) = $1
         OR LOWER(id) = $1
         OR SPLIT_PART(LOWER(email), '@', 1) = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [clean]);
    return res.rows[0];
  }

  public async findUserById(id: string): Promise<DBUser | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, email, password_hash as "passwordHash", role, full_name as "fullName",
             phone, is_verified as "isVerified", created_at as "createdAt"
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0];
  }

  public async createUser(user: DBUser): Promise<DBUser> {
    const pool = this.getClient();
    const query = `
      INSERT INTO users (id, email, password_hash, role, full_name, phone, is_verified, created_at)
      VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8)
      RETURNING id, email, password_hash as "passwordHash", role, full_name as "fullName",
                phone, is_verified as "isVerified", created_at as "createdAt";
    `;
    const res = await pool.query(query, [
      user.id,
      user.email,
      user.passwordHash,
      user.role,
      user.fullName,
      user.phone || null,
      user.isVerified ?? false,
      user.createdAt || new Date().toISOString(),
    ]);
    return res.rows[0];
  }

  // ============================================================================
  // Profile Operations
  // ============================================================================

  public async getCustomerProfile(userId: string): Promise<DBCustomerProfile | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, user_id as "userId", name, age, gender, occupation,
             marital_status as "maritalStatus", family_size as "familySize",
             has_pets as "hasPets", pet_type as "petType", religion, tribe,
             consent_share_religion_tribe as "consentShareReligionTribe",
             religion_tribe_consent_timestamp as "religionTribeConsentTimestamp",
             agreed_dpdp_notice_at as "agreedDpdpNoticeAt",
             dpdp_notice_version as "dpdpNoticeVersion",
             language_preference as "languagePreference",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM customer_profiles
      WHERE user_id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
  }

  public async upsertCustomerProfile(profile: DBCustomerProfile): Promise<DBCustomerProfile> {
    const pool = this.getClient();
    const id = profile.id || `cp_${Date.now()}`;
    const query = `
      INSERT INTO customer_profiles (
        id, user_id, name, age, gender, occupation, marital_status, family_size,
        has_pets, pet_type, religion, tribe, consent_share_religion_tribe,
        religion_tribe_consent_timestamp, agreed_dpdp_notice_at, dpdp_notice_version,
        language_preference, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        occupation = EXCLUDED.occupation,
        marital_status = EXCLUDED.marital_status,
        family_size = EXCLUDED.family_size,
        has_pets = EXCLUDED.has_pets,
        pet_type = EXCLUDED.pet_type,
        religion = EXCLUDED.religion,
        tribe = EXCLUDED.tribe,
        consent_share_religion_tribe = EXCLUDED.consent_share_religion_tribe,
        religion_tribe_consent_timestamp = EXCLUDED.religion_tribe_consent_timestamp,
        language_preference = EXCLUDED.language_preference,
        updated_at = NOW()
      RETURNING id, user_id as "userId", name, age, gender, occupation,
                marital_status as "maritalStatus", family_size as "familySize",
                has_pets as "hasPets", pet_type as "petType", religion, tribe,
                consent_share_religion_tribe as "consentShareReligionTribe",
                religion_tribe_consent_timestamp as "religionTribeConsentTimestamp",
                agreed_dpdp_notice_at as "agreedDpdpNoticeAt",
                dpdp_notice_version as "dpdpNoticeVersion",
                language_preference as "languagePreference",
                created_at as "createdAt", updated_at as "updatedAt";
    `;
    const res = await pool.query(query, [
      id,
      profile.userId,
      profile.name,
      profile.age || 21,
      profile.gender || 'Prefer not to say',
      profile.occupation || '',
      profile.maritalStatus || 'Prefer not to say',
      profile.familySize || 1,
      profile.hasPets ?? false,
      profile.petType || null,
      profile.religion || null,
      profile.tribe || null,
      profile.consentShareReligionTribe ?? false,
      profile.religionTribeConsentTimestamp || null,
      profile.agreedDpdpNoticeAt || new Date().toISOString(),
      profile.dpdpNoticeVersion || 'v1.0',
      profile.languagePreference || 'en',
    ]);
    return res.rows[0];
  }

  public async getOwnerProfile(userId: string): Promise<DBOwnerProfile | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, user_id as "userId", full_name as "fullName",
             phone_masked as "phoneMasked", phone_encrypted as "phoneEncrypted",
             pan_masked as "panMasked", pan_encrypted as "panEncrypted",
             pan_verified as "panVerified", aadhaar_masked as "aadhaarMasked",
             aadhaar_encrypted as "aadhaarEncrypted", aadhaar_verified as "aadhaarVerified",
             kyc_verified_at as "kycVerifiedAt", razorpay_account_id as "razorpayAccountId",
             bank_account_masked as "bankAccountMasked",
             agreed_anti_discrimination_terms_at as "agreedAntiDiscriminationTermsAt",
             strikes_count as "strikesCount", is_suspended as "isSuspended",
             suspension_reason as "suspensionReason",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM owner_profiles
      WHERE user_id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
  }

  public async upsertOwnerProfile(profile: DBOwnerProfile): Promise<DBOwnerProfile> {
    const pool = this.getClient();
    const id = profile.id || `op_${Date.now()}`;
    const query = `
      INSERT INTO owner_profiles (
        id, user_id, full_name, phone_masked, phone_encrypted,
        pan_masked, pan_encrypted, pan_verified, aadhaar_masked,
        aadhaar_encrypted, aadhaar_verified, kyc_verified_at,
        razorpay_account_id, bank_account_masked,
        agreed_anti_discrimination_terms_at, strikes_count, is_suspended, suspension_reason,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone_masked = EXCLUDED.phone_masked,
        phone_encrypted = EXCLUDED.phone_encrypted,
        pan_masked = EXCLUDED.pan_masked,
        pan_verified = EXCLUDED.pan_verified,
        aadhaar_masked = EXCLUDED.aadhaar_masked,
        aadhaar_verified = EXCLUDED.aadhaar_verified,
        razorpay_account_id = EXCLUDED.razorpay_account_id,
        bank_account_masked = EXCLUDED.bank_account_masked,
        updated_at = NOW()
      RETURNING id, user_id as "userId", full_name as "fullName",
                phone_masked as "phoneMasked", phone_encrypted as "phoneEncrypted",
                pan_masked as "panMasked", pan_encrypted as "panEncrypted",
                pan_verified as "panVerified", aadhaar_masked as "aadhaarMasked",
                aadhaar_encrypted as "aadhaarEncrypted", aadhaar_verified as "aadhaarVerified",
                kyc_verified_at as "kycVerifiedAt", razorpay_account_id as "razorpayAccountId",
                bank_account_masked as "bankAccountMasked",
                agreed_anti_discrimination_terms_at as "agreedAntiDiscriminationTermsAt",
                strikes_count as "strikesCount", is_suspended as "isSuspended",
                suspension_reason as "suspensionReason",
                created_at as "createdAt", updated_at as "updatedAt";
    `;
    const res = await pool.query(query, [
      id,
      profile.userId,
      profile.fullName,
      profile.phoneMasked || '',
      profile.phoneEncrypted || '',
      profile.panMasked || '',
      profile.panEncrypted || '',
      profile.panVerified ?? false,
      profile.aadhaarMasked || '',
      profile.aadhaarEncrypted || '',
      profile.aadhaarVerified ?? false,
      profile.kycVerifiedAt || null,
      profile.razorpayAccountId || null,
      profile.bankAccountMasked || null,
      profile.agreedAntiDiscriminationTermsAt || new Date().toISOString(),
      profile.strikesCount || 0,
      profile.isSuspended ?? false,
      profile.suspensionReason || null,
    ]);
    return res.rows[0];
  }

  // ============================================================================
  // Property Operations
  // ============================================================================

  private buildPropertiesWhereClause(ownerId?: string, filters?: PropertyFilters) {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (ownerId) {
      params.push(ownerId);
      conditions.push(`p.owner_id = $${params.length}`);
    }
    if (filters?.category) {
      params.push(filters.category);
      conditions.push(`p.category = $${params.length}`);
    }
    if (filters?.locality) {
      params.push(`%${filters.locality}%`);
      conditions.push(`p.locality ILIKE $${params.length}`);
    }
    if (filters?.city) {
      params.push(`%${filters.city}%`);
      conditions.push(`p.city ILIKE $${params.length}`);
    }
    if (filters?.minRent !== undefined) {
      params.push(filters.minRent);
      conditions.push(`p.rent_monthly >= $${params.length}`);
    }
    if (filters?.maxRent !== undefined) {
      params.push(filters.maxRent);
      conditions.push(`p.rent_monthly <= $${params.length}`);
    }
    if (filters?.bhk && filters.bhk !== 'All') {
      params.push(filters.bhk);
      conditions.push(`p.bhk = $${params.length}`);
    }
    if (filters?.propertyType && filters.propertyType !== 'All') {
      params.push(`%${filters.propertyType}%`);
      conditions.push(`p.property_type ILIKE $${params.length}`);
    }
    if (filters?.availability && filters.availability !== 'all') {
      params.push(filters.availability.toLowerCase());
      conditions.push(`LOWER(p.status) = $${params.length}`);
    }
    if (filters?.bedrooms !== undefined) {
      params.push(filters.bedrooms);
      conditions.push(`((p.requirements->>'bedrooms')::int >= $${params.length} OR EXISTS (SELECT 1 FROM property_units pu WHERE pu.property_id = p.id AND pu.bedrooms >= $${params.length}))`);
    }
    if (filters?.bathrooms !== undefined) {
      params.push(filters.bathrooms);
      conditions.push(`((p.requirements->>'bathrooms')::int >= $${params.length} OR EXISTS (SELECT 1 FROM property_units pu WHERE pu.property_id = p.id AND pu.bathrooms >= $${params.length}))`);
    }
    if (filters?.furnishing && filters.furnishing !== 'All') {
      params.push(`%${filters.furnishing}%`);
      conditions.push(`(p.requirements->>'furnishingStatus' ILIKE $${params.length} OR EXISTS (SELECT 1 FROM property_units pu WHERE pu.property_id = p.id AND pu.furnishing_status ILIKE $${params.length}))`);
    }
    if (filters?.genderPreference && filters.genderPreference !== 'ALL') {
      params.push(filters.genderPreference);
      conditions.push(`EXISTS (SELECT 1 FROM pg_hostel_metadata m WHERE m.property_id = p.id AND (m.gender_preference = $${params.length} OR m.gender_preference = 'ALL'))`);
    }
    if (filters?.foodIncluded === true || filters?.mealsIncluded === true) {
      conditions.push(`EXISTS (SELECT 1 FROM pg_hostel_metadata m WHERE m.property_id = p.id AND m.food_included = true)`);
    }
    if (filters?.dietaryPolicy && filters.dietaryPolicy !== 'ANY') {
      params.push(filters.dietaryPolicy);
      conditions.push(`EXISTS (SELECT 1 FROM pg_hostel_metadata m WHERE m.property_id = p.id AND (m.dietary_policy = $${params.length} OR m.dietary_policy = 'ANY'))`);
    }
    if (filters?.roomType && filters.roomType !== 'All') {
      params.push(filters.roomType);
      conditions.push(`EXISTS (SELECT 1 FROM property_rooms pr WHERE pr.property_id = p.id AND pr.room_type = $${params.length})`);
    }
    if (filters?.bedType && filters.bedType !== 'All') {
      params.push(filters.bedType);
      conditions.push(`EXISTS (SELECT 1 FROM bed_inventory bi WHERE bi.property_id = p.id AND bi.bed_type = $${params.length})`);
    }
    if (filters?.availableBedsOnly === true) {
      conditions.push(`EXISTS (SELECT 1 FROM bed_inventory bi WHERE bi.property_id = p.id AND bi.status = 'AVAILABLE')`);
    }
    if (filters?.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(p.title ILIKE $${params.length} OR p.locality ILIKE $${params.length} OR p.city ILIKE $${params.length})`);
    }

    return { whereSql: conditions.join(' AND '), params };
  }

  public async getPropertiesPaginated(
    ownerId?: string,
    filters?: PropertyFilters,
    pagination?: { page?: number; limit?: number; cursor?: string }
  ): Promise<{ properties: DBProperty[]; total: number; page: number; limit: number; hasMore: boolean; nextCursor?: string }> {
    const pool = this.getClient();
    const { whereSql, params } = this.buildPropertiesWhereClause(ownerId, filters);

    // Count query
    const countRes = await pool.query(`SELECT COUNT(DISTINCT p.id) as total FROM properties p WHERE ${whereSql}`, params);
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const page = Math.max(1, pagination?.page || 1);
    const limit = Math.min(30, Math.max(1, pagination?.limit || 10));
    const offset = (page - 1) * limit;

    let pagedWhere = whereSql;
    const queryParams = [...params];

    if (pagination?.cursor) {
      queryParams.push(pagination.cursor);
      pagedWhere += ` AND p.created_at < $${queryParams.length}`;
    }

    queryParams.push(limit);
    const limitIdx = queryParams.length;
    queryParams.push(offset);
    const offsetIdx = queryParams.length;

    const dataQuery = `
      SELECT p.id, p.owner_id as "ownerId", p.title, p.bhk, p.rent_monthly as "rentMonthly",
             p.security_deposit as "securityDeposit", p.locality, p.city, p.property_type as "propertyType",
             p.category, p.total_units as "totalUnits", p.occupied_units as "occupiedUnits", p.status,
             p.amenities, p.photos, p.requirements, p.approximate_lat as "approximateLat",
             p.approximate_lng as "approximateLng", p.full_address_encrypted as "fullAddressEncrypted",
             p.masked_address_preview as "maskedAddressPreview", p.created_at as "createdAt"
      FROM properties p
      WHERE ${pagedWhere}
      ORDER BY p.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const res = await pool.query(dataQuery, queryParams);
    const properties: DBProperty[] = res.rows.map((row) => ({
      ...row,
      rentMonthly: Number(row.rentMonthly),
      securityDeposit: Number(row.securityDeposit),
      approximateLat: row.approximateLat ? Number(row.approximateLat) : undefined,
      approximateLng: row.approximateLng ? Number(row.approximateLng) : undefined,
    }));

    if (properties.length > 0) {
      const propIds = properties.map((p) => p.id);
      const [unitsRes, roomsRes, bedsRes, metaRes] = await Promise.all([
        pool.query(
          `SELECT id, property_id as "propertyId", unit_number as "unitNumber", unit_type as "unitType",
                  floor_number as "floorNumber", bhk, bedrooms, bathrooms, rent_monthly as "rentMonthly",
                  security_deposit as "securityDeposit", status, availability_status as "availabilityStatus",
                  furnishing_status as "furnishingStatus", carpet_area_sqft as "carpetAreaSqft",
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM property_units WHERE property_id = ANY($1) ORDER BY unit_number ASC`,
          [propIds]
        ),
        pool.query(
          `SELECT id, property_id as "propertyId", room_number as "roomNumber", room_type as "roomType",
                  total_beds as "totalBeds", occupied_beds as "occupiedBeds", rent_per_bed as "rentPerBed",
                  security_deposit as "securityDeposit", attached_bathroom as "attachedBathroom",
                  has_balcony as "hasBalcony", air_conditioning as "airConditioning", status,
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM property_rooms WHERE property_id = ANY($1) ORDER BY room_number ASC`,
          [propIds]
        ),
        pool.query(
          `SELECT id, room_id as "roomId", property_id as "propertyId", bed_number as "bedNumber",
                  bed_type as "bedType", rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
                  status, tenant_id as "tenantId", version, created_at as "createdAt", updated_at as "updatedAt"
           FROM bed_inventory WHERE property_id = ANY($1) ORDER BY bed_number ASC`,
          [propIds]
        ),
        pool.query(
          `SELECT id, property_id as "propertyId", food_included as "foodIncluded", meal_offerings as "mealOfferings",
                  dietary_policy as "dietaryPolicy", gender_preference as "genderPreference",
                  curfew_time as "curfewTime", notice_period_days as "noticePeriodDays",
                  gate_closing_time as "gateClosingTime", warden_contact_name as "wardenContactName",
                  warden_contact_phone as "wardenContactPhone", visitor_policy as "visitorPolicy",
                  guest_restrictions as "guestRestrictions", smoking_policy as "smokingPolicy",
                  min_stay_months as "minStayMonths", common_facilities as "commonFacilities",
                  rules_and_regulations as "rulesAndRegulations", created_at as "createdAt", updated_at as "updatedAt"
           FROM pg_hostel_metadata WHERE property_id = ANY($1)`,
          [propIds]
        ),
      ]);

      const unitsMap = new Map<string, DBPropertyUnit[]>();
      unitsRes.rows.forEach((u) => {
        const item: DBPropertyUnit = {
          ...u,
          rentMonthly: Number(u.rentMonthly),
          securityDeposit: Number(u.securityDeposit),
          bedrooms: u.bedrooms ? Number(u.bedrooms) : 1,
          bathrooms: u.bathrooms ? Number(u.bathrooms) : 1,
          carpetAreaSqft: u.carpetAreaSqft ? Number(u.carpetAreaSqft) : undefined,
        };
        const list = unitsMap.get(u.propertyId) || [];
        list.push(item);
        unitsMap.set(u.propertyId, list);
      });

      const bedsMap = new Map<string, DBBedInventoryItem[]>();
      bedsRes.rows.forEach((b) => {
        const item: DBBedInventoryItem = {
          ...b,
          rentMonthly: Number(b.rentMonthly),
          securityDeposit: Number(b.securityDeposit),
        };
        const list = bedsMap.get(b.propertyId) || [];
        list.push(item);
        bedsMap.set(b.propertyId, list);
      });

      const roomsMap = new Map<string, DBPropertyRoom[]>();
      roomsRes.rows.forEach((r) => {
        const roomBeds = (bedsMap.get(r.propertyId) || []).filter((b) => b.roomId === r.id);
        const item: DBPropertyRoom = {
          ...r,
          totalBeds: Number(r.totalBeds),
          occupiedBeds: Number(r.occupiedBeds),
          rentPerBed: Number(r.rentPerBed),
          securityDeposit: Number(r.securityDeposit),
          beds: roomBeds,
        };
        const list = roomsMap.get(r.propertyId) || [];
        list.push(item);
        roomsMap.set(r.propertyId, list);
      });

      const metaMap = new Map<string, DBPgHostelMetadata>();
      metaRes.rows.forEach((m) => {
        metaMap.set(m.propertyId, m);
      });

      properties.forEach((p) => {
        p.units = unitsMap.get(p.id) || [];
        p.rooms = roomsMap.get(p.id) || [];
        p.beds = bedsMap.get(p.id) || [];
        p.pgHostelMetadata = metaMap.get(p.id);
      });
    }

    const hasMore = offset + properties.length < total;
    const lastProperty = properties[properties.length - 1];
    const nextCursor = hasMore && lastProperty ? lastProperty.createdAt : undefined;

    return {
      properties,
      total,
      page,
      limit,
      hasMore,
      nextCursor,
    };
  }

  public async getProperties(ownerId?: string, filters?: PropertyFilters): Promise<DBProperty[]> {
    const { properties } = await this.getPropertiesPaginated(ownerId, filters, { page: 1, limit: 1000 });
    return properties;
  }

  public async findPropertyById(id: string): Promise<DBProperty | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, owner_id as "ownerId", title, bhk, rent_monthly as "rentMonthly",
             security_deposit as "securityDeposit", locality, city, property_type as "propertyType",
             category, total_units as "totalUnits", occupied_units as "occupiedUnits", status,
             amenities, photos, requirements, approximate_lat as "approximateLat",
             approximate_lng as "approximateLng", full_address_encrypted as "fullAddressEncrypted",
             masked_address_preview as "maskedAddressPreview", created_at as "createdAt"
      FROM properties
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [id]);
    if (!res.rows[0]) return undefined;

    const prop: DBProperty = {
      ...res.rows[0],
      rentMonthly: Number(res.rows[0].rentMonthly),
      securityDeposit: Number(res.rows[0].securityDeposit),
    };

    const [unitsRes, roomsRes, bedsRes, metaRes] = await Promise.all([
      pool.query(
        `SELECT id, property_id as "propertyId", unit_number as "unitNumber", unit_type as "unitType",
                floor_number as "floorNumber", bhk, bedrooms, bathrooms,
                rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
                status, availability_status as "availabilityStatus",
                furnishing_status as "furnishingStatus", carpet_area_sqft as "carpetAreaSqft",
                created_at as "createdAt", updated_at as "updatedAt"
         FROM property_units WHERE property_id = $1 ORDER BY unit_number ASC`,
        [id]
      ),
      pool.query(
        `SELECT id, property_id as "propertyId", room_number as "roomNumber", room_type as "roomType",
                total_beds as "totalBeds", occupied_beds as "occupiedBeds", rent_per_bed as "rentPerBed",
                security_deposit as "securityDeposit", attached_bathroom as "attachedBathroom",
                has_balcony as "hasBalcony", air_conditioning as "airConditioning", status,
                created_at as "createdAt", updated_at as "updatedAt"
         FROM property_rooms WHERE property_id = $1 ORDER BY room_number ASC`,
        [id]
      ),
      pool.query(
        `SELECT id, room_id as "roomId", property_id as "propertyId", bed_number as "bedNumber",
                bed_type as "bedType", rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
                status, tenant_id as "tenantId", version, created_at as "createdAt", updated_at as "updatedAt"
         FROM bed_inventory WHERE property_id = $1 ORDER BY bed_number ASC`,
        [id]
      ),
      pool.query(
        `SELECT id, property_id as "propertyId", food_included as "foodIncluded", meal_offerings as "mealOfferings",
                dietary_policy as "dietaryPolicy", gender_preference as "genderPreference",
                curfew_time as "curfewTime", notice_period_days as "noticePeriodDays",
                gate_closing_time as "gateClosingTime", warden_contact_name as "wardenContactName",
                warden_contact_phone as "wardenContactPhone",
                visitor_policy as "visitorPolicy", guest_restrictions as "guestRestrictions",
                smoking_policy as "smokingPolicy", min_stay_months as "minStayMonths",
                common_facilities as "commonFacilities", rules_and_regulations as "rulesAndRegulations",
                created_at as "createdAt", updated_at as "updatedAt"
         FROM pg_hostel_metadata WHERE property_id = $1 LIMIT 1`,
        [id]
      ),
    ]);

    const beds: DBBedInventoryItem[] = bedsRes.rows.map((b) => ({
      ...b,
      rentMonthly: Number(b.rentMonthly),
      securityDeposit: Number(b.securityDeposit),
    }));

    const rooms: DBPropertyRoom[] = roomsRes.rows.map((r) => ({
      ...r,
      totalBeds: Number(r.totalBeds),
      occupiedBeds: Number(r.occupiedBeds),
      rentPerBed: Number(r.rentPerBed),
      securityDeposit: Number(r.securityDeposit),
      beds: beds.filter((b) => b.roomId === r.id),
    }));

    const units: DBPropertyUnit[] = unitsRes.rows.map((u) => ({
      ...u,
      rentMonthly: Number(u.rentMonthly),
      securityDeposit: Number(u.securityDeposit),
      carpetAreaSqft: u.carpetAreaSqft ? Number(u.carpetAreaSqft) : undefined,
    }));

    prop.units = units;
    prop.rooms = rooms;
    prop.beds = beds;
    if (metaRes.rows[0]) {
      prop.pgHostelMetadata = metaRes.rows[0];
    }

    return prop;
  }

  public async createProperty(prop: DBProperty): Promise<DBProperty> {
    const pool = this.getClient();
    const query = `
      INSERT INTO properties (
        id, owner_id, title, bhk, rent_monthly, security_deposit,
        locality, city, property_type, category, total_units, occupied_units, status,
        amenities, photos, requirements, approximate_lat, approximate_lng,
        full_address_encrypted, masked_address_preview, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id, owner_id as "ownerId", title, bhk, rent_monthly as "rentMonthly",
                security_deposit as "securityDeposit", locality, city, property_type as "propertyType",
                category, total_units as "totalUnits", occupied_units as "occupiedUnits", status,
                created_at as "createdAt";
    `;
    const res = await pool.query(query, [
      prop.id,
      prop.ownerId,
      prop.title,
      prop.bhk,
      prop.rentMonthly,
      prop.securityDeposit,
      prop.locality,
      prop.city,
      prop.propertyType,
      prop.category,
      prop.totalUnits || 1,
      prop.occupiedUnits || 0,
      prop.status || 'available',
      JSON.stringify(prop.amenities || []),
      JSON.stringify(prop.photos || []),
      JSON.stringify(prop.requirements || {}),
      prop.approximateLat || null,
      prop.approximateLng || null,
      prop.fullAddressEncrypted || null,
      prop.maskedAddressPreview || null,
      prop.createdAt || new Date().toISOString(),
    ]);

    return {
      ...res.rows[0],
      rentMonthly: Number(res.rows[0].rentMonthly),
      securityDeposit: Number(res.rows[0].securityDeposit),
    };
  }

  public async createPropertyUnit(unit: DBPropertyUnit): Promise<DBPropertyUnit> {
    const pool = this.getClient();
    const query = `
      INSERT INTO property_units (
        id, property_id, unit_number, unit_type, floor_number, bhk, bedrooms, bathrooms,
        rent_monthly, security_deposit, status, availability_status, furnishing_status,
        carpet_area_sqft, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING id, property_id as "propertyId", unit_number as "unitNumber", unit_type as "unitType",
                floor_number as "floorNumber", bhk, bedrooms, bathrooms,
                rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
                status, availability_status as "availabilityStatus",
                furnishing_status as "furnishingStatus", carpet_area_sqft as "carpetAreaSqft",
                created_at as "createdAt", updated_at as "updatedAt";
    `;
    const res = await pool.query(query, [
      unit.id,
      unit.propertyId,
      unit.unitNumber,
      unit.unitType || 'Standard',
      unit.floorNumber ?? null,
      unit.bhk ?? null,
      unit.bedrooms ?? 1,
      unit.bathrooms ?? 1,
      unit.rentMonthly,
      unit.securityDeposit ?? 0,
      unit.status || 'AVAILABLE',
      unit.availabilityStatus || unit.status || 'AVAILABLE',
      unit.furnishingStatus || 'SEMI_FURNISHED',
      unit.carpetAreaSqft ?? null,
    ]);
    return {
      ...res.rows[0],
      rentMonthly: Number(res.rows[0].rentMonthly),
      securityDeposit: Number(res.rows[0].securityDeposit),
      bedrooms: res.rows[0].bedrooms ? Number(res.rows[0].bedrooms) : 1,
      bathrooms: res.rows[0].bathrooms ? Number(res.rows[0].bathrooms) : 1,
      carpetAreaSqft: res.rows[0].carpetAreaSqft ? Number(res.rows[0].carpetAreaSqft) : undefined,
    };
  }

  public async getPropertyUnits(propertyId: string): Promise<DBPropertyUnit[]> {
    const pool = this.getClient();
    const res = await pool.query(
      `SELECT id, property_id as "propertyId", unit_number as "unitNumber", unit_type as "unitType",
              floor_number as "floorNumber", bhk, bedrooms, bathrooms,
              rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
              status, availability_status as "availabilityStatus",
              furnishing_status as "furnishingStatus", carpet_area_sqft as "carpetAreaSqft",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM property_units WHERE property_id = $1 ORDER BY unit_number ASC`,
      [propertyId]
    );
    return res.rows.map((u) => ({
      ...u,
      rentMonthly: Number(u.rentMonthly),
      securityDeposit: Number(u.securityDeposit),
      bedrooms: u.bedrooms ? Number(u.bedrooms) : 1,
      bathrooms: u.bathrooms ? Number(u.bathrooms) : 1,
      carpetAreaSqft: u.carpetAreaSqft ? Number(u.carpetAreaSqft) : undefined,
    }));
  }

  public async createPropertyRoom(room: DBPropertyRoom): Promise<DBPropertyRoom> {
    const pool = this.getClient();
    const query = `
      INSERT INTO property_rooms (
        id, property_id, room_number, room_type, total_beds, occupied_beds,
        rent_per_bed, security_deposit, attached_bathroom, has_balcony, air_conditioning,
        status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING id, property_id as "propertyId", room_number as "roomNumber", room_type as "roomType",
                total_beds as "totalBeds", occupied_beds as "occupiedBeds", rent_per_bed as "rentPerBed",
                security_deposit as "securityDeposit", attached_bathroom as "attachedBathroom",
                has_balcony as "hasBalcony", air_conditioning as "airConditioning", status,
                created_at as "createdAt", updated_at as "updatedAt";
    `;
    const res = await pool.query(query, [
      room.id,
      room.propertyId,
      room.roomNumber,
      room.roomType,
      room.totalBeds || 1,
      room.occupiedBeds || 0,
      room.rentPerBed,
      room.securityDeposit || 0,
      room.attachedBathroom ?? false,
      room.hasBalcony ?? false,
      room.airConditioning ?? false,
      room.status || 'AVAILABLE',
    ]);
    return {
      ...res.rows[0],
      totalBeds: Number(res.rows[0].totalBeds),
      occupiedBeds: Number(res.rows[0].occupiedBeds),
      rentPerBed: Number(res.rows[0].rentPerBed),
      securityDeposit: Number(res.rows[0].securityDeposit),
    };
  }

  public async getPropertyRooms(propertyId: string): Promise<DBPropertyRoom[]> {
    const pool = this.getClient();
    const [roomsRes, bedsRes] = await Promise.all([
      pool.query(
        `SELECT id, property_id as "propertyId", room_number as "roomNumber", room_type as "roomType",
                total_beds as "totalBeds", occupied_beds as "occupiedBeds", rent_per_bed as "rentPerBed",
                security_deposit as "securityDeposit", attached_bathroom as "attachedBathroom",
                has_balcony as "hasBalcony", air_conditioning as "airConditioning", status,
                created_at as "createdAt", updated_at as "updatedAt"
         FROM property_rooms WHERE property_id = $1 ORDER BY room_number ASC`,
        [propertyId]
      ),
      pool.query(
        `SELECT id, room_id as "roomId", property_id as "propertyId", bed_number as "bedNumber",
                bed_type as "bedType", rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
                status, tenant_id as "tenantId", version, created_at as "createdAt", updated_at as "updatedAt"
         FROM bed_inventory WHERE property_id = $1 ORDER BY bed_number ASC`,
        [propertyId]
      ),
    ]);

    const beds: DBBedInventoryItem[] = bedsRes.rows.map((b) => ({
      ...b,
      rentMonthly: Number(b.rentMonthly),
      securityDeposit: Number(b.securityDeposit),
    }));

    return roomsRes.rows.map((r) => ({
      ...r,
      totalBeds: Number(r.totalBeds),
      occupiedBeds: Number(r.occupiedBeds),
      rentPerBed: Number(r.rentPerBed),
      securityDeposit: Number(r.securityDeposit),
      beds: beds.filter((b) => b.roomId === r.id),
    }));
  }

  public async createBedInventory(bed: DBBedInventoryItem): Promise<DBBedInventoryItem> {
    const pool = this.getClient();
    const query = `
      INSERT INTO bed_inventory (
        id, room_id, property_id, bed_number, bed_type, rent_monthly,
        security_deposit, status, tenant_id, version, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, room_id as "roomId", property_id as "propertyId", bed_number as "bedNumber",
                bed_type as "bedType", rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
                status, tenant_id as "tenantId", version, created_at as "createdAt", updated_at as "updatedAt";
    `;
    const res = await pool.query(query, [
      bed.id,
      bed.roomId,
      bed.propertyId,
      bed.bedNumber,
      bed.bedType || 'SINGLE',
      bed.rentMonthly,
      bed.securityDeposit || 0,
      bed.status || 'AVAILABLE',
      bed.tenantId || null,
      bed.version || 1,
    ]);
    return {
      ...res.rows[0],
      rentMonthly: Number(res.rows[0].rentMonthly),
      securityDeposit: Number(res.rows[0].securityDeposit),
    };
  }

  public async getBedInventory(propertyId: string, roomId?: string): Promise<DBBedInventoryItem[]> {
    const pool = this.getClient();
    let query = `
      SELECT id, room_id as "roomId", property_id as "propertyId", bed_number as "bedNumber",
             bed_type as "bedType", rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
             status, tenant_id as "tenantId", version, created_at as "createdAt", updated_at as "updatedAt"
      FROM bed_inventory WHERE property_id = $1
    `;
    const params: any[] = [propertyId];
    if (roomId) {
      params.push(roomId);
      query += ` AND room_id = $2`;
    }
    query += ` ORDER BY bed_number ASC;`;
    const res = await pool.query(query, params);
    return res.rows.map((b) => ({
      ...b,
      rentMonthly: Number(b.rentMonthly),
      securityDeposit: Number(b.securityDeposit),
    }));
  }

  public async updateBedStatus(
    bedId: string,
    status: DBBedInventoryItem['status'],
    tenantId?: string | null,
    expectedVersion?: number
  ): Promise<{ success: boolean; bed?: DBBedInventoryItem; error?: string }> {
    const pool = this.getClient();
    let query = `
      UPDATE bed_inventory
      SET status = $1, tenant_id = $2, version = version + 1, updated_at = NOW()
      WHERE id = $3
    `;
    const params: any[] = [status, tenantId !== undefined ? tenantId : null, bedId];
    if (expectedVersion !== undefined) {
      params.push(expectedVersion);
      query += ` AND version = $${params.length}`;
    }
    query += `
      RETURNING id, room_id as "roomId", property_id as "propertyId", bed_number as "bedNumber",
                bed_type as "bedType", rent_monthly as "rentMonthly", security_deposit as "securityDeposit",
                status, tenant_id as "tenantId", version, created_at as "createdAt", updated_at as "updatedAt";
    `;

    const res = await pool.query(query, params);
    if (res.rows.length === 0) {
      const checkRes = await pool.query('SELECT version FROM bed_inventory WHERE id = $1', [bedId]);
      if (checkRes.rows.length === 0) {
        return { success: false, error: '404_NOT_FOUND: Bed not found' };
      }
      return { success: false, error: 'CONCURRENCY_CONFLICT: Bed was modified by another operation. Please refresh.' };
    }

    const updatedBed: DBBedInventoryItem = {
      ...res.rows[0],
      rentMonthly: Number(res.rows[0].rentMonthly),
      securityDeposit: Number(res.rows[0].securityDeposit),
    };

    // Synchronize room occupancy
    await pool.query(
      `UPDATE property_rooms r
       SET occupied_beds = (
         SELECT COUNT(*) FROM bed_inventory b WHERE b.room_id = r.id AND b.status = 'OCCUPIED'
       ),
       status = CASE
         WHEN (SELECT COUNT(*) FROM bed_inventory b WHERE b.room_id = r.id AND b.status = 'OCCUPIED') >= r.total_beds THEN 'FULL'
         ELSE 'AVAILABLE'
       END
       WHERE r.id = $1`,
      [updatedBed.roomId]
    );

    // Synchronize property occupied units
    await pool.query(
      `UPDATE properties p
       SET occupied_units = (
         SELECT COUNT(*) FROM property_rooms pr WHERE pr.property_id = p.id AND pr.status = 'FULL'
       )
       WHERE p.id = $1`,
      [updatedBed.propertyId]
    );

    return { success: true, bed: updatedBed };
  }

  public async upsertPgHostelMetadata(metadata: DBPgHostelMetadata): Promise<DBPgHostelMetadata> {
    const pool = this.getClient();
    const id = metadata.id || `pgm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const query = `
      INSERT INTO pg_hostel_metadata (
        id, property_id, food_included, meal_offerings, dietary_policy, gender_preference,
        curfew_time, notice_period_days, gate_closing_time, warden_contact_name,
        warden_contact_phone, visitor_policy, guest_restrictions, smoking_policy, min_stay_months,
        common_facilities, rules_and_regulations, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
      ON CONFLICT (property_id) DO UPDATE SET
        food_included = EXCLUDED.food_included,
        meal_offerings = EXCLUDED.meal_offerings,
        dietary_policy = EXCLUDED.dietary_policy,
        gender_preference = EXCLUDED.gender_preference,
        curfew_time = EXCLUDED.curfew_time,
        notice_period_days = EXCLUDED.notice_period_days,
        gate_closing_time = EXCLUDED.gate_closing_time,
        warden_contact_name = EXCLUDED.warden_contact_name,
        warden_contact_phone = EXCLUDED.warden_contact_phone,
        visitor_policy = EXCLUDED.visitor_policy,
        guest_restrictions = EXCLUDED.guest_restrictions,
        smoking_policy = EXCLUDED.smoking_policy,
        min_stay_months = EXCLUDED.min_stay_months,
        common_facilities = EXCLUDED.common_facilities,
        rules_and_regulations = EXCLUDED.rules_and_regulations,
        updated_at = NOW()
      RETURNING id, property_id as "propertyId", food_included as "foodIncluded",
                meal_offerings as "mealOfferings", dietary_policy as "dietaryPolicy",
                gender_preference as "genderPreference", curfew_time as "curfewTime",
                notice_period_days as "noticePeriodDays", gate_closing_time as "gateClosingTime",
                warden_contact_name as "wardenContactName", warden_contact_phone as "wardenContactPhone",
                visitor_policy as "visitorPolicy", guest_restrictions as "guestRestrictions",
                smoking_policy as "smokingPolicy", min_stay_months as "minStayMonths",
                common_facilities as "commonFacilities", rules_and_regulations as "rulesAndRegulations",
                created_at as "createdAt", updated_at as "updatedAt";
    `;
    const res = await pool.query(query, [
      id,
      metadata.propertyId,
      metadata.foodIncluded ?? false,
      JSON.stringify(metadata.mealOfferings || []),
      metadata.dietaryPolicy || 'ANY',
      metadata.genderPreference || 'ALL',
      metadata.curfewTime || null,
      metadata.noticePeriodDays ?? 30,
      metadata.gateClosingTime || null,
      metadata.wardenContactName || null,
      metadata.wardenContactPhone || null,
      metadata.visitorPolicy || 'ALLOWED_WITH_PASS',
      metadata.guestRestrictions || 'NO_OVERNIGHT_GUESTS',
      metadata.smokingPolicy || 'STRICTLY_PROHIBITED',
      metadata.minStayMonths ?? 1,
      JSON.stringify(metadata.commonFacilities || []),
      JSON.stringify(metadata.rulesAndRegulations || []),
    ]);

    return res.rows[0];
  }

  public async getPgHostelMetadata(propertyId: string): Promise<DBPgHostelMetadata | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, property_id as "propertyId", food_included as "foodIncluded",
             meal_offerings as "mealOfferings", dietary_policy as "dietaryPolicy",
             gender_preference as "genderPreference", curfew_time as "curfewTime",
             notice_period_days as "noticePeriodDays", gate_closing_time as "gateClosingTime",
             warden_contact_name as "wardenContactName", warden_contact_phone as "wardenContactPhone",
             visitor_policy as "visitorPolicy", guest_restrictions as "guestRestrictions",
             smoking_policy as "smokingPolicy", min_stay_months as "minStayMonths",
             common_facilities as "commonFacilities", rules_and_regulations as "rulesAndRegulations",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM pg_hostel_metadata
      WHERE property_id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [propertyId]);
    return res.rows[0];
  }

  public async updateProperty(id: string, updates: Partial<DBProperty>): Promise<DBProperty | undefined> {
    const pool = this.getClient();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.title) {
      fields.push(`title = $${idx++}`);
      values.push(updates.title);
    }
    if (updates.rentMonthly !== undefined) {
      fields.push(`rent_monthly = $${idx++}`);
      values.push(updates.rentMonthly);
    }
    if (updates.securityDeposit !== undefined) {
      fields.push(`security_deposit = $${idx++}`);
      values.push(updates.securityDeposit);
    }
    if (updates.status) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.occupiedUnits !== undefined) {
      fields.push(`occupied_units = $${idx++}`);
      values.push(updates.occupiedUnits);
    }

    if (fields.length === 0) return this.findPropertyById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);
    const query = `
      UPDATE properties
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, owner_id as "ownerId", title, bhk, rent_monthly as "rentMonthly",
                security_deposit as "securityDeposit", locality, city, property_type as "propertyType",
                total_units as "totalUnits", occupied_units as "occupiedUnits", status,
                created_at as "createdAt";
    `;
    const res = await pool.query(query, values);
    if (!res.rows[0]) return undefined;
    return {
      ...res.rows[0],
      rentMonthly: Number(res.rows[0].rentMonthly),
      securityDeposit: Number(res.rows[0].securityDeposit),
    };
  }

  public async deleteProperty(id: string): Promise<boolean> {
    const pool = this.getClient();
    const res = await pool.query(`DELETE FROM properties WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public async getSavedProperties(userId: string): Promise<DBProperty[]> {
    const pool = this.getClient();
    const query = `
      SELECT p.id, p.owner_id as "ownerId", p.title, p.bhk, p.rent_monthly as "rentMonthly",
             p.security_deposit as "securityDeposit", p.locality, p.city, p.property_type as "propertyType",
             p.total_units as "totalUnits", p.occupied_units as "occupiedUnits", p.status,
             p.created_at as "createdAt"
      FROM saved_properties s
      JOIN properties p ON s.property_id = p.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows.map((row) => ({
      ...row,
      rentMonthly: Number(row.rentMonthly),
      securityDeposit: Number(row.securityDeposit),
    }));
  }

  public async saveProperty(userId: string, propertyId: string): Promise<boolean> {
    const pool = this.getClient();
    const id = `save_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await pool.query(
      `INSERT INTO saved_properties (id, user_id, property_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, property_id) DO NOTHING;`,
      [id, userId, propertyId]
    );
    return true;
  }

  public async unsaveProperty(userId: string, propertyId: string): Promise<boolean> {
    const pool = this.getClient();
    await pool.query(`DELETE FROM saved_properties WHERE user_id = $1 AND property_id = $2;`, [
      userId,
      propertyId,
    ]);
    return true;
  }

  // ============================================================================
  // Application Operations
  // ============================================================================

  public async getApplications(userId?: string, role?: string, ownerId?: string): Promise<DBApplication[]> {
    const pool = this.getClient();
    let query = `
      SELECT a.id, a.listing_id as "listingId", a.customer_id as "customerId",
             a.applicant_name as "applicantName", a.applicant_email as "applicantEmail",
             a.monthly_income as "monthlyIncome", a.status,
             a.application_fee_paid as "applicationFeePaid",
             a.application_fee_amount as "applicationFeeAmount",
             a.payment_id as "paymentId",
             a.rejection_reason_code as "rejectionReasonCode",
             a.rejection_reason_explanation as "rejectionReasonExplanation",
             a.brokerage_amount as "brokerageAmount",
             a.brokerage_paid as "brokeragePaid",
             a.deposit_balance_amount as "depositBalanceAmount",
             a.deposit_balance_paid as "depositBalancePaid",
             a.created_at as "createdAt"
      FROM applications a
    `;
    const params: any[] = [];

    if (role === 'CUSTOMER' && userId) {
      query += ` WHERE a.customer_id = $1`;
      params.push(userId);
    } else if (role === 'OWNER' && ownerId) {
      query += `
        JOIN properties p ON a.listing_id = p.id
        WHERE p.owner_id = $1
      `;
      params.push(ownerId);
    }
    query += ` ORDER BY a.created_at DESC;`;

    const res = await pool.query(query, params);
    return res.rows.map((row) => ({
      ...row,
      monthlyIncome: Number(row.monthlyIncome),
      applicationFeeAmount: row.applicationFeeAmount ? Number(row.applicationFeeAmount) : 20,
      brokerageAmount: row.brokerageAmount ? Number(row.brokerageAmount) : undefined,
      depositBalanceAmount: row.depositBalanceAmount ? Number(row.depositBalanceAmount) : undefined,
    }));
  }

  public async findApplicationById(id: string): Promise<DBApplication | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, listing_id as "listingId", customer_id as "customerId",
             applicant_name as "applicantName", applicant_email as "applicantEmail",
             monthly_income as "monthlyIncome", status,
             application_fee_paid as "applicationFeePaid",
             application_fee_amount as "applicationFeeAmount",
             payment_id as "paymentId",
             rejection_reason_code as "rejectionReasonCode",
             rejection_reason_explanation as "rejectionReasonExplanation",
             brokerage_amount as "brokerageAmount",
             brokerage_paid as "brokeragePaid",
             deposit_balance_amount as "depositBalanceAmount",
             deposit_balance_paid as "depositBalancePaid",
             created_at as "createdAt"
      FROM applications
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [id]);
    if (!res.rows[0]) return undefined;
    return {
      ...res.rows[0],
      monthlyIncome: Number(res.rows[0].monthlyIncome),
      applicationFeeAmount: res.rows[0].applicationFeeAmount ? Number(res.rows[0].applicationFeeAmount) : 20,
      brokerageAmount: res.rows[0].brokerageAmount ? Number(res.rows[0].brokerageAmount) : undefined,
      depositBalanceAmount: res.rows[0].depositBalanceAmount ? Number(res.rows[0].depositBalanceAmount) : undefined,
    };
  }

  public async createApplication(app: DBApplication): Promise<DBApplication> {
    const pool = this.getClient();
    const query = `
      INSERT INTO applications (
        id, listing_id, customer_id, applicant_name, applicant_email,
        monthly_income, status, application_fee_paid, application_fee_amount, payment_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, listing_id as "listingId", customer_id as "customerId",
                applicant_name as "applicantName", applicant_email as "applicantEmail",
                monthly_income as "monthlyIncome", status,
                application_fee_paid as "applicationFeePaid",
                application_fee_amount as "applicationFeeAmount",
                payment_id as "paymentId", created_at as "createdAt";
    `;
    const res = await pool.query(query, [
      app.id,
      app.listingId,
      app.customerId,
      app.applicantName,
      app.applicantEmail,
      app.monthlyIncome,
      app.status || 'pending',
      app.applicationFeePaid ?? false,
      app.applicationFeeAmount || 20,
      app.paymentId || null,
      app.createdAt || new Date().toISOString(),
    ]);

    return {
      ...res.rows[0],
      monthlyIncome: Number(res.rows[0].monthlyIncome),
      applicationFeeAmount: Number(res.rows[0].applicationFeeAmount || 20),
    };
  }

  public async updateApplicationStatus(
    appId: string,
    status: DBApplication['status'],
    details?: { rejectionReasonCode?: string; rejectionReasonExplanation?: string }
  ): Promise<DBApplication | undefined> {
    const pool = this.getClient();
    let query = `
      UPDATE applications
      SET status = $1, updated_at = NOW()
    `;
    const params: any[] = [status];
    let idx = 2;

    if (details?.rejectionReasonCode) {
      query += `, rejection_reason_code = $${idx++}`;
      params.push(details.rejectionReasonCode);
    }
    if (details?.rejectionReasonExplanation) {
      query += `, rejection_reason_explanation = $${idx++}`;
      params.push(details.rejectionReasonExplanation);
    }

    // When accepted, calculate 10% brokerage based on property monthly rent
    if (status === 'accepted') {
      const propRes = await pool.query(
        `SELECT p.rent_monthly, p.security_deposit FROM applications a JOIN properties p ON a.listing_id = p.id WHERE a.id = $1;`,
        [appId]
      );
      if (propRes.rows[0]) {
        const rentMonthly = Number(propRes.rows[0].rent_monthly);
        const secDeposit = Number(propRes.rows[0].security_deposit);
        const brokerage = Math.round(rentMonthly * 0.1); // 10% of 1 month rent
        query += `, brokerage_amount = $${idx++}, deposit_balance_amount = $${idx++}`;
        params.push(brokerage, secDeposit);
      }
    }

    query += ` WHERE id = $${idx}
      RETURNING id, listing_id as "listingId", customer_id as "customerId",
                applicant_name as "applicantName", applicant_email as "applicantEmail",
                monthly_income as "monthlyIncome", status,
                application_fee_paid as "applicationFeePaid",
                application_fee_amount as "applicationFeeAmount",
                payment_id as "paymentId",
                rejection_reason_code as "rejectionReasonCode",
                rejection_reason_explanation as "rejectionReasonExplanation",
                brokerage_amount as "brokerageAmount",
                brokerage_paid as "brokeragePaid",
                deposit_balance_amount as "depositBalanceAmount",
                deposit_balance_paid as "depositBalancePaid",
                created_at as "createdAt";`;
    params.push(appId);

    const res = await pool.query(query, params);
    if (!res.rows[0]) return undefined;
    return {
      ...res.rows[0],
      monthlyIncome: Number(res.rows[0].monthlyIncome),
      applicationFeeAmount: Number(res.rows[0].applicationFeeAmount || 20),
      brokerageAmount: res.rows[0].brokerageAmount ? Number(res.rows[0].brokerageAmount) : undefined,
      depositBalanceAmount: res.rows[0].depositBalanceAmount ? Number(res.rows[0].depositBalanceAmount) : undefined,
    };
  }

  // ============================================================================
  // Rental Agreement Operations
  // ============================================================================

  public async getAgreements(userId?: string, role?: string): Promise<DBRentalAgreement[]> {
    const pool = this.getClient();
    let query = `
      SELECT id, application_id as "applicationId", listing_id as "listingId",
             property_title as "propertyTitle", property_address as "propertyAddress",
             tenant_id as "tenantId", tenant_name as "tenantName",
             owner_id as "ownerId", owner_name as "ownerName",
             monthly_rent as "monthlyRent", security_deposit as "securityDeposit",
             commencement_date as "commencementDate", tenancy_period_months as "tenancyPeriodMonths",
             status, tenant_signed_at as "tenantSignedAt", owner_signed_at as "ownerSignedAt",
             contract_hash as "contractHash", created_at as "createdAt"
      FROM rental_agreements
    `;
    const params: any[] = [];
    if (role === 'CUSTOMER' && userId) {
      query += ` WHERE tenant_id = $1`;
      params.push(userId);
    } else if (role === 'OWNER' && userId) {
      query += ` WHERE owner_id = $1`;
      params.push(userId);
    }
    query += ` ORDER BY created_at DESC;`;

    const res = await pool.query(query, params);
    return res.rows.map((row) => ({
      ...row,
      monthlyRent: Number(row.monthlyRent),
      securityDeposit: Number(row.securityDeposit),
    }));
  }

  public async findAgreementById(id: string): Promise<DBRentalAgreement | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, application_id as "applicationId", listing_id as "listingId",
             property_title as "propertyTitle", property_address as "propertyAddress",
             tenant_id as "tenantId", tenant_name as "tenantName",
             owner_id as "ownerId", owner_name as "ownerName",
             monthly_rent as "monthlyRent", security_deposit as "securityDeposit",
             commencement_date as "commencementDate", tenancy_period_months as "tenancyPeriodMonths",
             status, tenant_signed_at as "tenantSignedAt", owner_signed_at as "ownerSignedAt",
             contract_hash as "contractHash", created_at as "createdAt"
      FROM rental_agreements
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [id]);
    if (!res.rows[0]) return undefined;
    return {
      ...res.rows[0],
      monthlyRent: Number(res.rows[0].monthlyRent),
      securityDeposit: Number(res.rows[0].securityDeposit),
    };
  }

  public async createAgreement(agreement: DBRentalAgreement): Promise<DBRentalAgreement> {
    const pool = this.getClient();
    const query = `
      INSERT INTO rental_agreements (
        id, application_id, listing_id, property_title, property_address,
        tenant_id, tenant_name, owner_id, owner_name, monthly_rent, security_deposit,
        commencement_date, tenancy_period_months, status, contract_hash, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, application_id as "applicationId", listing_id as "listingId",
                property_title as "propertyTitle", property_address as "propertyAddress",
                tenant_id as "tenantId", tenant_name as "tenantName",
                owner_id as "ownerId", owner_name as "ownerName",
                monthly_rent as "monthlyRent", security_deposit as "securityDeposit",
                commencement_date as "commencementDate", tenancy_period_months as "tenancyPeriodMonths",
                status, contract_hash as "contractHash", created_at as "createdAt";
    `;
    const res = await pool.query(query, [
      agreement.id,
      agreement.applicationId,
      agreement.listingId,
      agreement.propertyTitle,
      agreement.propertyAddress,
      agreement.tenantId,
      agreement.tenantName,
      agreement.ownerId,
      agreement.ownerName,
      agreement.monthlyRent,
      agreement.securityDeposit,
      agreement.commencementDate,
      agreement.tenancyPeriodMonths || 11,
      agreement.status || 'draft',
      agreement.contractHash || '',
      agreement.createdAt || new Date().toISOString(),
    ]);

    return {
      ...res.rows[0],
      monthlyRent: Number(res.rows[0].monthlyRent),
      securityDeposit: Number(res.rows[0].securityDeposit),
    };
  }

  public async signAgreement(id: string, role: 'customer' | 'owner'): Promise<DBRentalAgreement | undefined> {
    const pool = this.getClient();
    const existing = await this.findAgreementById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    let query: string;
    let params: any[];

    if (role === 'customer') {
      const willBeActive = Boolean(existing.ownerSignedAt);
      query = `
        UPDATE rental_agreements
        SET tenant_signed_at = $1, status = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *;
      `;
      params = [now, willBeActive ? 'active' : 'pending_signatures', id];
    } else {
      const willBeActive = Boolean(existing.tenantSignedAt);
      query = `
        UPDATE rental_agreements
        SET owner_signed_at = $1, status = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *;
      `;
      params = [now, willBeActive ? 'active' : 'pending_signatures', id];
    }

    const res = await pool.query(query, params);
    if (!res.rows[0]) return undefined;
    return this.findAgreementById(id);
  }

  public async concludeAgreement(id: string): Promise<DBRentalAgreement | undefined> {
    const pool = this.getClient();
    await pool.query(
      `UPDATE rental_agreements SET status = 'concluded', updated_at = NOW() WHERE id = $1;`,
      [id]
    );
    return this.findAgreementById(id);
  }

  // ============================================================================
  // Reviews & Content Moderation Operations
  // ============================================================================

  public async createReview(review: DBReview): Promise<DBReview> {
    const pool = this.getClient();
    const query = `
      INSERT INTO reviews (
        id, agreement_id, listing_id, property_title, tenant_id, tenant_name,
        owner_id, owner_name, property_rating, owner_rating, overall_rating,
        cleanliness_rating, maintenance_rating, communication_rating, deposit_return_rating,
        title, review_text, tags, moderation_status, flagged_reason, auto_moderated,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
      RETURNING *;
    `;
    const res = await pool.query(query, [
      review.id,
      review.agreementId,
      review.listingId,
      review.propertyTitle,
      review.tenantId,
      review.tenantName,
      review.ownerId,
      review.ownerName,
      review.propertyRating,
      review.ownerRating,
      review.overallRating,
      review.cleanlinessRating ?? null,
      review.maintenanceRating ?? null,
      review.communicationRating ?? null,
      review.depositReturnRating ?? null,
      review.title,
      review.reviewText,
      JSON.stringify(review.tags || []),
      review.moderationStatus || 'approved',
      review.flaggedReason ?? null,
      review.autoModerated ?? false,
    ]);

    return this.mapReviewRow(res.rows[0]);
  }

  public async getReviews(filter?: {
    listingId?: string;
    ownerId?: string;
    tenantId?: string;
    moderationStatus?: string;
  }): Promise<DBReview[]> {
    const pool = this.getClient();
    let query = `SELECT * FROM reviews WHERE 1=1`;
    const params: any[] = [];

    if (filter?.listingId) {
      params.push(filter.listingId);
      query += ` AND listing_id = $${params.length}`;
    }
    if (filter?.ownerId) {
      params.push(filter.ownerId);
      query += ` AND owner_id = $${params.length}`;
    }
    if (filter?.tenantId) {
      params.push(filter.tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (filter?.moderationStatus) {
      params.push(filter.moderationStatus);
      query += ` AND moderation_status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC;`;
    const res = await pool.query(query, params);
    return res.rows.map((row) => this.mapReviewRow(row));
  }

  public async findReviewById(id: string): Promise<DBReview | undefined> {
    const pool = this.getClient();
    const res = await pool.query(`SELECT * FROM reviews WHERE id = $1 LIMIT 1;`, [id]);
    if (!res.rows[0]) return undefined;
    return this.mapReviewRow(res.rows[0]);
  }

  public async findReviewByAgreementId(agreementId: string): Promise<DBReview | undefined> {
    const pool = this.getClient();
    const res = await pool.query(`SELECT * FROM reviews WHERE agreement_id = $1 LIMIT 1;`, [agreementId]);
    if (!res.rows[0]) return undefined;
    return this.mapReviewRow(res.rows[0]);
  }

  public async updateReviewModeration(
    id: string,
    status: string,
    details?: { flaggedReason?: string; moderatedBy?: string; moderationNotes?: string }
  ): Promise<DBReview | undefined> {
    const pool = this.getClient();
    const res = await pool.query(
      `
      UPDATE reviews
      SET moderation_status = $1,
          flagged_reason = COALESCE($2, flagged_reason),
          moderated_by = $3,
          moderation_notes = $4,
          moderated_at = NOW(),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *;
      `,
      [status, details?.flaggedReason ?? null, details?.moderatedBy ?? null, details?.moderationNotes ?? null, id]
    );
    if (!res.rows[0]) return undefined;
    return this.mapReviewRow(res.rows[0]);
  }

  public async addOwnerResponse(id: string, _ownerId: string, response: string): Promise<DBReview | undefined> {
    const pool = this.getClient();
    const res = await pool.query(
      `
      UPDATE reviews
      SET owner_response = $1,
          owner_responded_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [response, id]
    );
    if (!res.rows[0]) return undefined;
    return this.mapReviewRow(res.rows[0]);
  }

  public async flagReview(id: string, reason: string): Promise<DBReview | undefined> {
    const pool = this.getClient();
    const res = await pool.query(
      `
      UPDATE reviews
      SET moderation_status = 'flagged',
          flagged_reason = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [reason, id]
    );
    if (!res.rows[0]) return undefined;
    return this.mapReviewRow(res.rows[0]);
  }

  private mapReviewRow(row: any): DBReview {
    return {
      id: row.id,
      agreementId: row.agreement_id,
      listingId: row.listing_id,
      propertyTitle: row.property_title,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      propertyRating: Number(row.property_rating),
      ownerRating: Number(row.owner_rating),
      overallRating: Number(row.overall_rating),
      cleanlinessRating: row.cleanliness_rating ? Number(row.cleanliness_rating) : undefined,
      maintenanceRating: row.maintenance_rating ? Number(row.maintenance_rating) : undefined,
      communicationRating: row.communication_rating ? Number(row.communication_rating) : undefined,
      depositReturnRating: row.deposit_return_rating ? Number(row.deposit_return_rating) : undefined,
      title: row.title,
      reviewText: row.review_text,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || [],
      moderationStatus: row.moderation_status,
      flaggedReason: row.flagged_reason,
      autoModerated: Boolean(row.auto_moderated),
      moderatedBy: row.moderated_by,
      moderatedAt: row.moderated_at,
      moderationNotes: row.moderation_notes,
      ownerResponse: row.owner_response,
      ownerRespondedAt: row.owner_responded_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // Payment Operations
  // ============================================================================

  public async getPayments(payerOrPayeeId?: string): Promise<DBPayment[]> {
    const pool = this.getClient();
    let query = `
      SELECT id, application_id as "applicationId", property_id as "propertyId",
             payer_id as "payerId", payee_id as "payeeId", amount, currency,
             type, status, provider_reference as "providerReference",
             provider_status as "providerStatus", signature_verified as "signatureVerified",
             metadata, created_at as "createdAt"
      FROM payments
    `;
    const params: any[] = [];
    if (payerOrPayeeId) {
      query += ` WHERE payer_id = $1 OR payee_id = $1`;
      params.push(payerOrPayeeId);
    }
    query += ` ORDER BY created_at DESC;`;

    const res = await pool.query(query, params);
    return res.rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
    }));
  }

  public async findPaymentById(id: string): Promise<DBPayment | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, application_id as "applicationId", property_id as "propertyId",
             payer_id as "payerId", payee_id as "payeeId", amount, currency,
             type, status, provider_reference as "providerReference",
             provider_status as "providerStatus", signature_verified as "signatureVerified",
             metadata, created_at as "createdAt"
      FROM payments
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [id]);
    if (!res.rows[0]) return undefined;
    return {
      ...res.rows[0],
      amount: Number(res.rows[0].amount),
    };
  }

  public async createPayment(payment: DBPayment): Promise<DBPayment> {
    const pool = this.getClient();
    const query = `
      INSERT INTO payments (
        id, application_id, property_id, payer_id, payee_id, amount, currency,
        type, status, provider_reference, provider_status, signature_verified, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, application_id as "applicationId", property_id as "propertyId",
                payer_id as "payerId", payee_id as "payeeId", amount, currency,
                type, status, provider_reference as "providerReference",
                provider_status as "providerStatus", signature_verified as "signatureVerified",
                metadata, created_at as "createdAt";
    `;
    const res = await pool.query(query, [
      payment.id,
      payment.applicationId || null,
      payment.propertyId || null,
      payment.payerId,
      payment.payeeId,
      payment.amount,
      payment.currency || 'INR',
      payment.type,
      payment.status || 'PENDING',
      payment.providerReference || null,
      payment.providerStatus || null,
      payment.signatureVerified ?? false,
      JSON.stringify(payment.metadata || {}),
      payment.createdAt || new Date().toISOString(),
    ]);

    return {
      ...res.rows[0],
      amount: Number(res.rows[0].amount),
    };
  }

  public async updatePaymentStatus(
    paymentId: string,
    status: DBPayment['status'],
    providerReference?: string
  ): Promise<DBPayment | undefined> {
    const pool = this.getClient();
    let query = `
      UPDATE payments
      SET status = $1, updated_at = NOW()
    `;
    const params: any[] = [status];
    let idx = 2;

    if (providerReference) {
      query += `, provider_reference = $${idx++}, signature_verified = true`;
      params.push(providerReference);
    }

    query += ` WHERE id = $${idx}
      RETURNING id, application_id as "applicationId", property_id as "propertyId",
                payer_id as "payerId", payee_id as "payeeId", amount, currency,
                type, status, provider_reference as "providerReference",
                provider_status as "providerStatus", signature_verified as "signatureVerified",
                metadata, created_at as "createdAt";`;
    params.push(paymentId);

    const res = await pool.query(query, params);
    if (!res.rows[0]) return undefined;
    return {
      ...res.rows[0],
      amount: Number(res.rows[0].amount),
    };
  }

  /**
   * Finalizes application fee payment atomically within a PostgreSQL transaction.
   */
  public async finalizeApplicationFeePayment(
    paymentId: string,
    applicationId: string,
    providerRef: string
  ): Promise<{ payment: DBPayment; application?: DBApplication }> {
    const pool = this.getClient();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Mark payment as SUCCESSFUL
      const payRes = await client.query(
        `UPDATE payments
         SET status = 'SUCCESSFUL', provider_reference = $1, signature_verified = true, updated_at = NOW()
         WHERE id = $2
         RETURNING id, application_id as "applicationId", property_id as "propertyId",
                   payer_id as "payerId", payee_id as "payeeId", amount, currency,
                   type, status, provider_reference as "providerReference",
                   signature_verified as "signatureVerified", created_at as "createdAt";`,
        [providerRef, paymentId]
      );

      if (!payRes.rows[0]) {
        throw new Error(`Payment record ${paymentId} not found`);
      }

      // 2. Mark application fee as paid
      const appRes = await client.query(
        `UPDATE applications
         SET application_fee_paid = true, payment_id = $1, status = 'pending', updated_at = NOW()
         WHERE id = $2
         RETURNING id, listing_id as "listingId", customer_id as "customerId",
                   applicant_name as "applicantName", applicant_email as "applicantEmail",
                   monthly_income as "monthlyIncome", status,
                   application_fee_paid as "applicationFeePaid",
                   payment_id as "paymentId", created_at as "createdAt";`,
        [paymentId, applicationId]
      );

      await client.query('COMMIT');

      const payment: DBPayment = {
        ...payRes.rows[0],
        amount: Number(payRes.rows[0].amount),
      };

      const application: DBApplication | undefined = appRes.rows[0]
        ? {
            ...appRes.rows[0],
            monthlyIncome: Number(appRes.rows[0].monthlyIncome),
          }
        : undefined;

      return { payment, application };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async createRefund(refund: DBRefundRecord): Promise<DBRefundRecord> {
    const pool = this.getClient();
    const query = `
      INSERT INTO refund_records (
        id, transaction_id, application_id, user_id, user_name, amount,
        reason, status, reference_id, admin_notes, requested_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, transaction_id as "transactionId", application_id as "applicationId",
                user_id as "userId", user_name as "userName", amount, reason, status,
                requested_at as "requestedAt", resolved_at as "resolvedAt",
                reference_id as "referenceId", admin_notes as "adminNotes", created_at as "createdAt";
    `;
    const res = await pool.query(query, [
      refund.id,
      refund.transactionId,
      refund.applicationId || null,
      refund.userId,
      refund.userName,
      refund.amount,
      refund.reason,
      refund.status || 'Refund Requested',
      refund.referenceId,
      refund.adminNotes || null,
      refund.requestedAt || new Date().toISOString(),
    ]);

    return {
      ...res.rows[0],
      amount: Number(res.rows[0].amount),
    };
  }

  public async getRefunds(userId?: string): Promise<DBRefundRecord[]> {
    const pool = this.getClient();
    let query = `
      SELECT id, transaction_id as "transactionId", application_id as "applicationId",
             user_id as "userId", user_name as "userName", amount, reason, status,
             requested_at as "requestedAt", resolved_at as "resolvedAt",
             reference_id as "referenceId", admin_notes as "adminNotes", created_at as "createdAt"
      FROM refund_records
    `;
    const params: any[] = [];
    if (userId) {
      query += ` WHERE user_id = $1`;
      params.push(userId);
    }
    query += ` ORDER BY requested_at DESC;`;

    const res = await pool.query(query, params);
    return res.rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
    }));
  }

  // ============================================================================
  // Rejection Reports & Grievances
  // ============================================================================

  public async createReport(report: DBRejectionReport): Promise<DBRejectionReport> {
    const pool = this.getClient();
    const query = `
      INSERT INTO rejection_reports (
        id, application_id, customer_id, reported_owner_id,
        allegation_description, rejection_reason_given, status, admin_notes, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, application_id as "applicationId", customer_id as "customerId",
                reported_owner_id as "reportedOwnerId", allegation_description as "allegationDescription",
                rejection_reason_given as "rejectionReasonGiven", status, admin_notes as "adminNotes",
                created_at as "createdAt", resolved_at as "resolvedAt";
    `;
    const res = await pool.query(query, [
      report.id,
      report.applicationId,
      report.customerId,
      report.reportedOwnerId,
      report.allegationDescription,
      report.rejectionReasonGiven || null,
      report.status || 'pending_review',
      report.adminNotes || null,
      report.createdAt || new Date().toISOString(),
    ]);
    return res.rows[0];
  }

  public async getReports(userId?: string, role?: string): Promise<DBRejectionReport[]> {
    const pool = this.getClient();
    let query = `
      SELECT id, application_id as "applicationId", customer_id as "customerId",
             reported_owner_id as "reportedOwnerId", allegation_description as "allegationDescription",
             rejection_reason_given as "rejectionReasonGiven", status, admin_notes as "adminNotes",
             created_at as "createdAt", resolved_at as "resolvedAt"
      FROM rejection_reports
    `;
    const params: any[] = [];
    if (role === 'CUSTOMER' && userId) {
      query += ` WHERE customer_id = $1`;
      params.push(userId);
    } else if (role === 'OWNER' && userId) {
      query += ` WHERE reported_owner_id = $1`;
      params.push(userId);
    }
    query += ` ORDER BY created_at DESC;`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  public async updateReportStatus(
    id: string,
    status: DBRejectionReport['status'],
    adminNotes?: string
  ): Promise<DBRejectionReport | undefined> {
    const pool = this.getClient();
    const query = `
      UPDATE rejection_reports
      SET status = $1, admin_notes = COALESCE($2, admin_notes), resolved_at = NOW()
      WHERE id = $3
      RETURNING id, application_id as "applicationId", customer_id as "customerId",
                reported_owner_id as "reportedOwnerId", allegation_description as "allegationDescription",
                rejection_reason_given as "rejectionReasonGiven", status, admin_notes as "adminNotes",
                created_at as "createdAt", resolved_at as "resolvedAt";
    `;
    const res = await pool.query(query, [status, adminNotes || null, id]);
    return res.rows[0];
  }

  // ============================================================================
  // DPDP Consent Logs
  // ============================================================================

  public async logConsent(consent: DBConsentLog): Promise<DBConsentLog> {
    const pool = this.getClient();
    const query = `
      INSERT INTO consent_logs (
        id, user_id, consent_type, granted, version, ip_address, purpose, retention_period, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, user_id as "userId", consent_type as "consentType", granted,
                version, ip_address as "ipAddress", purpose, retention_period as "retentionPeriod", timestamp;
    `;
    const res = await pool.query(query, [
      consent.id,
      consent.userId,
      consent.consentType,
      consent.granted ?? true,
      consent.version || 'v1.0',
      consent.ipAddress || null,
      consent.purpose,
      consent.retentionPeriod || '7 years',
      consent.timestamp || new Date().toISOString(),
    ]);
    return res.rows[0];
  }

  public async getConsents(userId: string): Promise<DBConsentLog[]> {
    const pool = this.getClient();
    const query = `
      SELECT id, user_id as "userId", consent_type as "consentType", granted,
             version, ip_address as "ipAddress", purpose, retention_period as "retentionPeriod", timestamp
      FROM consent_logs
      WHERE user_id = $1
      ORDER BY timestamp DESC;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows;
  }

  // ============================================================================
  // Audit Logs
  // ============================================================================

  public async logAudit(log: Omit<DBAuditLog, 'id' | 'createdAt'>): Promise<DBAuditLog> {
    const pool = this.getClient();
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const query = `
      INSERT INTO audit_logs (id, user_id, action, category, details, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, user_id as "userId", action, category, details, ip_address as "ipAddress", created_at as "createdAt";
    `;
    const res = await pool.query(query, [
      id,
      log.userId || null,
      log.action,
      log.category,
      log.details,
      log.ipAddress || null,
    ]);
    return res.rows[0];
  }

  public async getAuditLogs(): Promise<DBAuditLog[]> {
    const pool = this.getClient();
    const query = `
      SELECT id, user_id as "userId", action, category, details, ip_address as "ipAddress", created_at as "createdAt"
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100;
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  // ============================================================================
  // Operational Metrics
  // ============================================================================

  public async getAdminMetrics(): Promise<Record<string, any>> {
    const pool = this.getClient();
    const usersCount = (await pool.query(`SELECT count(*) FROM users`)).rows[0].count;
    const propertiesCount = (await pool.query(`SELECT count(*) FROM properties`)).rows[0].count;
    const applicationsCount = (await pool.query(`SELECT count(*) FROM applications`)).rows[0].count;
    const paymentsRes = (
      await pool.query(
        `SELECT count(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'SUCCESSFUL'`
      )
    ).rows[0];
    const reportsCount = (
      await pool.query(`SELECT count(*) FROM rejection_reports WHERE status = 'pending_review'`)
    ).rows[0].count;

    return {
      totalUsers: Number(usersCount),
      totalProperties: Number(propertiesCount),
      totalApplications: Number(applicationsCount),
      totalPayments: Number(paymentsRes.count),
      totalVolume: Number(paymentsRes.total),
      activeReports: Number(reportsCount),
    };
  }

  public async getOwnerMetrics(ownerId: string): Promise<Record<string, any>> {
    const pool = this.getClient();
    const propsRes = await pool.query(
      `SELECT count(*) as count, COALESCE(SUM(total_units), 0) as total_units, COALESCE(SUM(occupied_units), 0) as occupied_units FROM properties WHERE owner_id = $1`,
      [ownerId]
    );
    const appsCount = (
      await pool.query(
        `SELECT count(*) FROM applications a JOIN properties p ON a.listing_id = p.id WHERE p.owner_id = $1`,
        [ownerId]
      )
    ).rows[0].count;

    const row = propsRes.rows[0];
    const totalUnits = Number(row.total_units);
    const occupiedUnits = Number(row.occupied_units);
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return {
      propertiesCount: Number(row.count),
      applicationsCount: Number(appsCount),
      totalUnits,
      occupiedUnits,
      occupancyRate: Math.round(occupancyRate),
    };
  }

  // ============================================================================
  // Notification Dispatch Operations (Persistent audit & duplicate prevention)
  // ============================================================================

  public async createNotificationDispatch(dispatch: DBNotificationDispatch): Promise<DBNotificationDispatch> {
    const pool = this.getClient();

    // Idempotency check to prevent duplicate dispatches
    if (dispatch.idempotencyKey) {
      const existing = await this.findNotificationDispatchByIdempotencyKey(dispatch.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const query = `
      INSERT INTO notification_dispatches (
        id, application_id, recipient_email, recipient_phone, recipient_name, property_title,
        notification_type, status, in_app_status, email_status, sms_status, channels,
        subject, email_body, sms_body, reason_code, reason_title, explanation,
        idempotency_key, retry_count, max_retries, last_error, dispatched_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      )
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING
        id, application_id as "applicationId", recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone", recipient_name as "recipientName",
        property_title as "propertyTitle", notification_type as "notificationType",
        status, in_app_status as "inAppStatus", email_status as "emailStatus",
        sms_status as "smsStatus", channels, subject, email_body as "emailBody",
        sms_body as "smsBody", reason_code as "reasonCode", reason_title as "reasonTitle",
        explanation, idempotency_key as "idempotencyKey", retry_count as "retryCount",
        max_retries as "maxRetries", last_error as "lastError",
        dispatched_at as "dispatchedAt", created_at as "createdAt", updated_at as "updatedAt";
    `;

    const now = new Date().toISOString();
    const values = [
      dispatch.id,
      dispatch.applicationId ?? null,
      dispatch.recipientEmail,
      dispatch.recipientPhone ?? null,
      dispatch.recipientName,
      dispatch.propertyTitle,
      dispatch.notificationType || 'APPLICATION_REJECTED',
      dispatch.status,
      dispatch.inAppStatus || 'RECORDED',
      dispatch.emailStatus,
      dispatch.smsStatus,
      dispatch.channels || ['EMAIL'],
      dispatch.subject,
      dispatch.emailBody,
      dispatch.smsBody ?? null,
      dispatch.reasonCode ?? null,
      dispatch.reasonTitle ?? null,
      dispatch.explanation ?? null,
      dispatch.idempotencyKey ?? null,
      dispatch.retryCount || 0,
      dispatch.maxRetries || 3,
      dispatch.lastError ?? null,
      dispatch.dispatchedAt || now,
      dispatch.createdAt || now,
      dispatch.updatedAt || now,
    ];

    const res = await pool.query(query, values);
    if (res.rows.length === 0 && dispatch.idempotencyKey) {
      const existing = await this.findNotificationDispatchByIdempotencyKey(dispatch.idempotencyKey);
      if (existing) return existing;
    }
    return res.rows[0] || dispatch;
  }

  public async findNotificationDispatchById(id: string): Promise<DBNotificationDispatch | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT
        id, application_id as "applicationId", recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone", recipient_name as "recipientName",
        property_title as "propertyTitle", notification_type as "notificationType",
        status, in_app_status as "inAppStatus", email_status as "emailStatus",
        sms_status as "smsStatus", channels, subject, email_body as "emailBody",
        sms_body as "smsBody", reason_code as "reasonCode", reason_title as "reasonTitle",
        explanation, idempotency_key as "idempotencyKey", retry_count as "retryCount",
        max_retries as "maxRetries", last_error as "lastError",
        dispatched_at as "dispatchedAt", created_at as "createdAt", updated_at as "updatedAt"
      FROM notification_dispatches
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0];
  }

  public async findNotificationDispatchByIdempotencyKey(key: string): Promise<DBNotificationDispatch | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT
        id, application_id as "applicationId", recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone", recipient_name as "recipientName",
        property_title as "propertyTitle", notification_type as "notificationType",
        status, in_app_status as "inAppStatus", email_status as "emailStatus",
        sms_status as "smsStatus", channels, subject, email_body as "emailBody",
        sms_body as "smsBody", reason_code as "reasonCode", reason_title as "reasonTitle",
        explanation, idempotency_key as "idempotencyKey", retry_count as "retryCount",
        max_retries as "maxRetries", last_error as "lastError",
        dispatched_at as "dispatchedAt", created_at as "createdAt", updated_at as "updatedAt"
      FROM notification_dispatches
      WHERE idempotency_key = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [key]);
    return res.rows[0];
  }

  public async getNotificationDispatches(filter?: { applicationId?: string; recipientEmail?: string }): Promise<DBNotificationDispatch[]> {
    const pool = this.getClient();
    let query = `
      SELECT
        id, application_id as "applicationId", recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone", recipient_name as "recipientName",
        property_title as "propertyTitle", notification_type as "notificationType",
        status, in_app_status as "inAppStatus", email_status as "emailStatus",
        sms_status as "smsStatus", channels, subject, email_body as "emailBody",
        sms_body as "smsBody", reason_code as "reasonCode", reason_title as "reasonTitle",
        explanation, idempotency_key as "idempotencyKey", retry_count as "retryCount",
        max_retries as "maxRetries", last_error as "lastError",
        dispatched_at as "dispatchedAt", created_at as "createdAt", updated_at as "updatedAt"
      FROM notification_dispatches
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filter?.applicationId) {
      params.push(filter.applicationId);
      query += ` AND application_id = $${params.length}`;
    }
    if (filter?.recipientEmail) {
      params.push(filter.recipientEmail.toLowerCase());
      query += ` AND LOWER(recipient_email) = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC;`;
    const res = await pool.query(query, params);
    return res.rows;
  }

  public async updateNotificationDispatch(id: string, updates: Partial<DBNotificationDispatch>): Promise<DBNotificationDispatch | undefined> {
    const pool = this.getClient();
    const setClauses: string[] = [];
    const values: any[] = [id];

    if (updates.status !== undefined) {
      values.push(updates.status);
      setClauses.push(`status = $${values.length}`);
    }
    if (updates.inAppStatus !== undefined) {
      values.push(updates.inAppStatus);
      setClauses.push(`in_app_status = $${values.length}`);
    }
    if (updates.emailStatus !== undefined) {
      values.push(updates.emailStatus);
      setClauses.push(`email_status = $${values.length}`);
    }
    if (updates.smsStatus !== undefined) {
      values.push(updates.smsStatus);
      setClauses.push(`sms_status = $${values.length}`);
    }
    if (updates.retryCount !== undefined) {
      values.push(updates.retryCount);
      setClauses.push(`retry_count = $${values.length}`);
    }
    if (updates.lastError !== undefined) {
      values.push(updates.lastError);
      setClauses.push(`last_error = $${values.length}`);
    }

    values.push(new Date().toISOString());
    setClauses.push(`updated_at = $${values.length}`);

    if (setClauses.length === 1) return this.findNotificationDispatchById(id);

    const query = `
      UPDATE notification_dispatches
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING
        id, application_id as "applicationId", recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone", recipient_name as "recipientName",
        property_title as "propertyTitle", notification_type as "notificationType",
        status, in_app_status as "inAppStatus", email_status as "emailStatus",
        sms_status as "smsStatus", channels, subject, email_body as "emailBody",
        sms_body as "smsBody", reason_code as "reasonCode", reason_title as "reasonTitle",
        explanation, idempotency_key as "idempotencyKey", retry_count as "retryCount",
        max_retries as "maxRetries", last_error as "lastError",
        dispatched_at as "dispatchedAt", created_at as "createdAt", updated_at as "updatedAt";
    `;
    const res = await pool.query(query, values);
    return res.rows[0];
  }

  // ============================================================================
  // Delegated Memberships & Secondary Access
  // ============================================================================

  public async findBrokerMembershipByUserId(userId: string): Promise<DBBrokerMembership | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, user_id as "userId", agency_id as "agencyId", membership_role as "membershipRole",
             permissions, status, created_at as "createdAt", updated_at as "updatedAt"
      FROM broker_memberships
      WHERE user_id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
  }

  public async findStaffMembershipByUserId(userId: string): Promise<DBStaffMembership | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, user_id as "userId", staff_role as "staffRole", assigned_region as "assignedRegion",
             status, permissions, created_at as "createdAt", updated_at as "updatedAt"
      FROM staff_memberships
      WHERE user_id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0];
  }

  public async getAgencies(): Promise<DBAgency[]> {
    const pool = this.getClient();
    const query = `
      SELECT id, business_name as "businessName", registration_details as "registrationDetails",
             verification_status as "verificationStatus", contact_email as "contactEmail",
             contact_phone as "contactPhone", address, city, created_at as "createdAt", updated_at as "updatedAt"
      FROM agencies
      ORDER BY created_at DESC;
    `;
    const res = await pool.query(query);
    return res.rows;
  }

  public async findAgencyById(id: string): Promise<DBAgency | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, business_name as "businessName", registration_details as "registrationDetails",
             verification_status as "verificationStatus", contact_email as "contactEmail",
             contact_phone as "contactPhone", address, city, created_at as "createdAt", updated_at as "updatedAt"
      FROM agencies
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await pool.query(query, [id]);
    return res.rows[0];
  }

  public async createAgency(agency: DBAgency): Promise<DBAgency> {
    const pool = this.getClient();
    const query = `
      INSERT INTO agencies (
        id, business_name, registration_details, verification_status,
        contact_email, contact_phone, address, city, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        registration_details = EXCLUDED.registration_details,
        verification_status = EXCLUDED.verification_status,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        updated_at = NOW()
      RETURNING
        id, business_name as "businessName", registration_details as "registrationDetails",
        verification_status as "verificationStatus", contact_email as "contactEmail",
        contact_phone as "contactPhone", address, city, created_at as "createdAt", updated_at as "updatedAt";
    `;
    const now = new Date().toISOString();
    const res = await pool.query(query, [
      agency.id,
      agency.businessName,
      agency.registrationDetails,
      agency.verificationStatus,
      agency.contactEmail,
      agency.contactPhone,
      agency.address,
      agency.city,
      agency.createdAt || now,
      agency.updatedAt || now,
    ]);
    return res.rows[0];
  }

  public async createBrokerMembership(membership: DBBrokerMembership): Promise<DBBrokerMembership> {
    const pool = this.getClient();
    const query = `
      INSERT INTO broker_memberships (
        id, user_id, agency_id, membership_role, permissions, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, agency_id) DO UPDATE SET
        membership_role = EXCLUDED.membership_role,
        permissions = EXCLUDED.permissions,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING
        id, user_id as "userId", agency_id as "agencyId", membership_role as "membershipRole",
        permissions, status, created_at as "createdAt", updated_at as "updatedAt";
    `;
    const now = new Date().toISOString();
    const res = await pool.query(query, [
      membership.id,
      membership.userId,
      membership.agencyId,
      membership.membershipRole,
      JSON.stringify(membership.permissions || []),
      membership.status,
      membership.createdAt || now,
      membership.updatedAt || now,
    ]);
    return res.rows[0];
  }

  public async updateBrokerMembershipStatus(membershipId: string, status: DBBrokerMembership['status']): Promise<boolean> {
    const pool = this.getClient();
    const query = `
      UPDATE broker_memberships
      SET status = $1, updated_at = NOW()
      WHERE id = $2;
    `;
    const res = await pool.query(query, [status, membershipId]);
    return (res.rowCount ?? 0) > 0;
  }

  public async createStaffMembership(membership: DBStaffMembership): Promise<DBStaffMembership> {
    const pool = this.getClient();
    const query = `
      INSERT INTO staff_memberships (
        id, user_id, staff_role, assigned_region, status, permissions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        staff_role = EXCLUDED.staff_role,
        assigned_region = EXCLUDED.assigned_region,
        status = EXCLUDED.status,
        permissions = EXCLUDED.permissions,
        updated_at = NOW()
      RETURNING
        id, user_id as "userId", staff_role as "staffRole", assigned_region as "assignedRegion",
        status, permissions, created_at as "createdAt", updated_at as "updatedAt";
    `;
    const now = new Date().toISOString();
    const res = await pool.query(query, [
      membership.id,
      membership.userId,
      membership.staffRole,
      membership.assignedRegion,
      membership.status,
      JSON.stringify(membership.permissions || []),
      membership.createdAt || now,
      membership.updatedAt || now,
    ]);
    return res.rows[0];
  }

  public async updateStaffMembershipStatus(membershipId: string, status: DBStaffMembership['status']): Promise<boolean> {
    const pool = this.getClient();
    const query = `
      UPDATE staff_memberships
      SET status = $1, updated_at = NOW()
      WHERE id = $2;
    `;
    const res = await pool.query(query, [status, membershipId]);
    return (res.rowCount ?? 0) > 0;
  }

  public async createPropertyAuthorization(auth: DBPropertyAuthorization): Promise<DBPropertyAuthorization> {
    const pool = this.getClient();
    const query = `
      INSERT INTO property_authorizations (
        id, property_id, owner_id, agency_id, permission_scope, authorization_type,
        doc_reference, valid_from, valid_until, verification_status, verified_by, verified_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (property_id, agency_id) DO UPDATE SET
        permission_scope = EXCLUDED.permission_scope,
        authorization_type = EXCLUDED.authorization_type,
        doc_reference = EXCLUDED.doc_reference,
        valid_from = EXCLUDED.valid_from,
        valid_until = EXCLUDED.valid_until,
        verification_status = EXCLUDED.verification_status,
        verified_by = EXCLUDED.verified_by,
        verified_at = EXCLUDED.verified_at,
        updated_at = NOW()
      RETURNING
        id, property_id as "propertyId", owner_id as "ownerId", agency_id as "agencyId",
        permission_scope as "permissionScope", authorization_type as "authorizationType",
        doc_reference as "docReference", valid_from as "validFrom", valid_until as "validUntil",
        verification_status as "verificationStatus", verified_by as "verifiedBy", verified_at as "verifiedAt",
        created_at as "createdAt", updated_at as "updatedAt";
    `;
    const now = new Date().toISOString();
    const res = await pool.query(query, [
      auth.id,
      auth.propertyId,
      auth.ownerId,
      auth.agencyId,
      auth.permissionScope,
      auth.authorizationType,
      auth.docReference || null,
      auth.validFrom,
      auth.validUntil,
      auth.verificationStatus,
      auth.verifiedBy || null,
      auth.verifiedAt || null,
      auth.createdAt || now,
      auth.updatedAt || now,
    ]);
    return res.rows[0];
  }

  public async findPropertyAuthorization(propertyId: string, agencyId: string): Promise<DBPropertyAuthorization | undefined> {
    const pool = this.getClient();
    const query = `
      SELECT id, property_id as "propertyId", owner_id as "ownerId", agency_id as "agencyId",
             permission_scope as "permissionScope", authorization_type as "authorizationType",
             doc_reference as "docReference", valid_from as "validFrom", valid_until as "validUntil",
             verification_status as "verificationStatus", verified_by as "verifiedBy", verified_at as "verifiedAt",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM property_authorizations
      WHERE property_id = $1 AND agency_id = $2
      LIMIT 1;
    `;
    const res = await pool.query(query, [propertyId, agencyId]);
    return res.rows[0];
  }

  public async updatePropertyAuthorizationStatus(
    authId: string,
    status: DBPropertyAuthorization['verificationStatus'],
    verifiedBy?: string
  ): Promise<boolean> {
    const pool = this.getClient();
    const query = `
      UPDATE property_authorizations
      SET verification_status = $1,
          verified_by = COALESCE($2, verified_by),
          verified_at = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE verified_at END,
          updated_at = NOW()
      WHERE id = $3;
    `;
    const res = await pool.query(query, [status, verifiedBy || null, authId]);
    return (res.rowCount ?? 0) > 0;
  }
}
