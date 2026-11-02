import assert from 'assert';
import { db, DBProperty, DBPropertyRoom, DBBedInventoryItem, DBPgHostelMetadata } from '../db/database';
import { RESIDENTIAL_CATEGORY_DISPLAY, RESIDENTIAL_CATEGORIES } from '../../src/types/index';
import { propertyCreationSchema, propertyQuerySchema } from '../utils/validation';
import { verifyDatabaseConnection } from '../db/index';

let passedCount = 0;
let failedCount = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`  ✗ ${name}:`, err.message);
      failedCount++;
    }
  };
}

async function main() {
  console.log('\n================================================================');
  console.log('   STEP 5A: RESIDENTIAL PROPERTY TAXONOMY & INVENTORY SUITE');
  console.log('================================================================\n');

  await verifyDatabaseConnection();

  // Test fixtures setup using valid pre-seeded accounts for FK integrity
  const testOwnerId = 'user_owner_201';
  const otherOwnerId = 'user_owner_202';
  const testCustomerId = 'user_cust_101';

  let createdApartmentId = '';
  let createdPgId = '';
  let createdHostelId = '';
  let createdSharedRoomId = '';
  let pgRoomId = '';
  let hostelRoomId = '';
  let hostelLowerBedId = '';
  let initialBedVersion = 1;

  const tests = [
    // -------------------------------------------------------------------------
    // 1. Taxonomy & Category Mapping (Tests 1-7)
    // -------------------------------------------------------------------------
    runTest('1. APARTMENT category maps to "Apartments & Flats"', () => {
      assert.strictEqual(RESIDENTIAL_CATEGORY_DISPLAY['APARTMENT'], 'Apartments & Flats');
    }),

    runTest('2. INDEPENDENT_HOUSE category maps to "Independent Houses"', () => {
      assert.strictEqual(RESIDENTIAL_CATEGORY_DISPLAY['INDEPENDENT_HOUSE'], 'Independent Houses');
    }),

    runTest('3. VILLA category maps to "Villas"', () => {
      assert.strictEqual(RESIDENTIAL_CATEGORY_DISPLAY['VILLA'], 'Villas');
    }),

    runTest('4. PG category maps to "PG Accommodation"', () => {
      assert.strictEqual(RESIDENTIAL_CATEGORY_DISPLAY['PG'], 'PG Accommodation');
    }),

    runTest('5. HOSTEL category maps to "Hostels"', () => {
      assert.strictEqual(RESIDENTIAL_CATEGORY_DISPLAY['HOSTEL'], 'Hostels');
    }),

    runTest('6. SHARED_ROOM category maps to "Shared Rooms"', () => {
      assert.strictEqual(RESIDENTIAL_CATEGORY_DISPLAY['SHARED_ROOM'], 'Shared Rooms');
      assert.strictEqual(RESIDENTIAL_CATEGORIES.length, 6, 'Must have exactly 6 normalized categories');
    }),

    runTest('7. Validation schema rejects invalid or commercial property categories', () => {
      const invalidQuery = propertyQuerySchema.safeParse({ category: 'COMMERCIAL' });
      assert.strictEqual(invalidQuery.success, false, 'Commercial category must not be accepted in residential query');
      const hotelQuery = propertyQuerySchema.safeParse({ category: 'HOTEL' });
      assert.strictEqual(hotelQuery.success, false, 'HOTEL category must not be accepted in residential query');
    }),

    // -------------------------------------------------------------------------
    // 2. Existing Data Preservation & Migration Backfill (Tests 8-10)
    // -------------------------------------------------------------------------
    runTest('8. Existing database listings retain their records without data loss', async () => {
      const allProps = await db.getProperties();
      assert.ok(allProps.length >= 6, 'All pre-existing listings must exist in database');
      const lst1 = allProps.find((p) => p.id === 'lst_1');
      assert.ok(lst1, 'lst_1 must exist');
      assert.strictEqual(lst1.rentMonthly, 12500, 'Original rent must be preserved');
    }),

    runTest('9. Safe transactional migration backfilled categories accurately', async () => {
      const allProps = await db.getProperties();
      const lst1 = allProps.find((p) => p.id === 'lst_1');
      const lst2 = allProps.find((p) => p.id === 'lst_2');
      const lst3 = allProps.find((p) => p.id === 'lst_3');

      assert.ok(lst1?.category === 'VILLA', `lst_1 (Gated Villa) must be backfilled to VILLA, got ${lst1?.category}`);
      assert.ok(lst2?.category === 'APARTMENT', `lst_2 (Apartment) must be backfilled to APARTMENT, got ${lst2?.category}`);
      assert.ok(lst3?.category === 'INDEPENDENT_HOUSE', `lst_3 (Independent House) must be backfilled to INDEPENDENT_HOUSE, got ${lst3?.category}`);
    }),

    runTest('10. Foreign key relations and owner associations remain intact post-migration', async () => {
      const lst1 = await db.findPropertyById('lst_1');
      assert.ok(lst1?.ownerId, 'Owner ID relation must be preserved');
      assert.ok(lst1?.locality, 'Locality must be preserved');
    }),

    // -------------------------------------------------------------------------
    // 3. Property Creation API with Category (Tests 11-14)
    // -------------------------------------------------------------------------
    runTest('11. Create APARTMENT listing successfully with category column', async () => {
      const propId = `prop_apt_${Date.now()}`;
      const created = await db.createProperty({
        id: propId,
        ownerId: testOwnerId,
        title: 'Capital View Luxury Apartment',
        bhk: '2 BHK',
        rentMonthly: 22000,
        securityDeposit: 50000,
        locality: 'Ganga Lake Corridor',
        city: 'Itanagar',
        propertyType: 'Apartment',
        category: 'APARTMENT',
        totalUnits: 4,
        occupiedUnits: 1,
        status: 'available',
        createdAt: new Date().toISOString(),
      });
      assert.strictEqual(created.category, 'APARTMENT');
      assert.strictEqual(created.id, propId);
      createdApartmentId = propId;
    }),

    runTest('12. Create INDEPENDENT_HOUSE listing successfully', async () => {
      const propId = `prop_house_${Date.now()}`;
      const created = await db.createProperty({
        id: propId,
        ownerId: testOwnerId,
        title: 'Pine Ridge Private Bungalow',
        bhk: '3 BHK',
        rentMonthly: 30000,
        securityDeposit: 75000,
        locality: 'Papu Hill View',
        city: 'Naharlagun',
        propertyType: 'Independent House',
        category: 'INDEPENDENT_HOUSE',
        totalUnits: 1,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });
      assert.strictEqual(created.category, 'INDEPENDENT_HOUSE');
    }),

    runTest('13. Create VILLA listing successfully', async () => {
      const propId = `prop_villa_${Date.now()}`;
      const created = await db.createProperty({
        id: propId,
        ownerId: testOwnerId,
        title: 'Ganga Serenity Villa Estate',
        bhk: '4 BHK',
        rentMonthly: 55000,
        securityDeposit: 150000,
        locality: 'Lake View Enclave',
        city: 'Itanagar',
        propertyType: 'Villa',
        category: 'VILLA',
        totalUnits: 1,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });
      assert.strictEqual(created.category, 'VILLA');
    }),

    runTest('14. Property creation validation enforces valid category enum values', () => {
      const invalid = propertyCreationSchema.safeParse({
        title: 'Invalid Space',
        bhk: '2 BHK',
        rentMonthly: 15000,
        securityDeposit: 30000,
        locality: 'Center',
        city: 'Itanagar',
        propertyType: 'Apartment',
        category: 'WAREHOUSE', // Not in residential enum
        totalUnits: 1,
        occupiedUnits: 0,
      });
      assert.strictEqual(invalid.success, false, 'Invalid category must be rejected by validator');
    }),

    // -------------------------------------------------------------------------
    // 4. PG Property & Operational Metadata (Tests 15-17)
    // -------------------------------------------------------------------------
    runTest('15. Create PG Accommodation listing with category = "PG"', async () => {
      const propId = `prop_pg_${Date.now()}`;
      const created = await db.createProperty({
        id: propId,
        ownerId: testOwnerId,
        title: 'Green Valley Executive PG for Professionals',
        bhk: 'Studio',
        rentMonthly: 8500,
        securityDeposit: 17000,
        locality: 'Zero Point Road',
        city: 'Itanagar',
        propertyType: 'PG Accommodation',
        category: 'PG',
        totalUnits: 10,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });
      assert.strictEqual(created.category, 'PG');
      createdPgId = propId;
    }),

    runTest('16. Associate PG operational metadata (meals, rules, curfew, warden)', async () => {
      const meta = await db.upsertPgHostelMetadata({
        propertyId: createdPgId,
        foodIncluded: true,
        mealOfferings: ['BREAKFAST', 'DINNER'],
        dietaryPolicy: 'VEG_ONLY',
        genderPreference: 'MALE_ONLY',
        curfewTime: '22:00',
        noticePeriodDays: 30,
        gateClosingTime: '22:30',
        wardenContactName: 'Bikash Gogoi',
        wardenContactPhone: '+91 98111 00222',
        commonFacilities: ['WIFI', 'RO_WATER', 'LAUNDRY', 'POWER_BACKUP'],
        rulesAndRegulations: ['No smoking inside premises', 'Quiet hours after 23:00'],
      });
      assert.strictEqual(meta.foodIncluded, true);
      assert.strictEqual(meta.dietaryPolicy, 'VEG_ONLY');
      assert.strictEqual(meta.wardenContactName, 'Bikash Gogoi');
    }),

    runTest('17. Property detail endpoint includes composite PG operational metadata', async () => {
      const prop = await db.findPropertyById(createdPgId);
      assert.ok(prop?.pgHostelMetadata, 'findPropertyById must join pgHostelMetadata');
      assert.strictEqual(prop?.pgHostelMetadata?.foodIncluded, true);
      assert.strictEqual(prop?.pgHostelMetadata?.dietaryPolicy, 'VEG_ONLY');
    }),

    // -------------------------------------------------------------------------
    // 5. PG & Hostel Room Inventory (Tests 18-20)
    // -------------------------------------------------------------------------
    runTest('18. Add single occupancy room to PG listing', async () => {
      const roomId = `room_pg_single_${Date.now()}`;
      const room = await db.createPropertyRoom({
        id: roomId,
        propertyId: createdPgId,
        roomNumber: '101',
        roomType: 'SINGLE',
        totalBeds: 1,
        occupiedBeds: 0,
        rentPerBed: 9000,
        securityDeposit: 18000,
        attachedBathroom: true,
        hasBalcony: true,
        airConditioning: true,
        status: 'AVAILABLE',
      });
      assert.strictEqual(room.roomType, 'SINGLE');
      assert.strictEqual(room.totalBeds, 1);
      assert.strictEqual(room.occupiedBeds, 0);
      pgRoomId = roomId;
    }),

    runTest('19. Add double sharing room to PG listing', async () => {
      const roomId = `room_pg_double_${Date.now()}`;
      const room = await db.createPropertyRoom({
        id: roomId,
        propertyId: createdPgId,
        roomNumber: '102',
        roomType: 'DOUBLE_SHARING',
        totalBeds: 2,
        occupiedBeds: 0,
        rentPerBed: 6000,
        securityDeposit: 12000,
        attachedBathroom: true,
        hasBalcony: false,
        airConditioning: false,
        status: 'AVAILABLE',
      });
      assert.strictEqual(room.totalBeds, 2);
      assert.strictEqual(room.rentPerBed, 6000);
    }),

    runTest('20. Retrieve all rooms for PG property with room-level pricing', async () => {
      const rooms = await db.getPropertyRooms(createdPgId);
      assert.strictEqual(rooms.length, 2, 'PG should have 2 rooms configured');
      const r101 = rooms.find((r) => r.roomNumber === '101');
      assert.strictEqual(r101?.rentPerBed, 9000);
    }),

    // -------------------------------------------------------------------------
    // 6. Hostel Bunk Bed Inventory (Tests 21-23)
    // -------------------------------------------------------------------------
    runTest('21. Create HOSTEL listing and add dormitory room', async () => {
      const propId = `prop_hostel_${Date.now()}`;
      await db.createProperty({
        id: propId,
        ownerId: testOwnerId,
        title: 'Youth Mountain Backpackers & Student Hostel',
        bhk: 'Studio',
        rentMonthly: 4500,
        securityDeposit: 9000,
        locality: 'College Road, Chandranagar',
        city: 'Itanagar',
        propertyType: 'Hostel',
        category: 'HOSTEL',
        totalUnits: 4,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });
      createdHostelId = propId;

      const roomId = `room_hostel_dorm_${Date.now()}`;
      const room = await db.createPropertyRoom({
        id: roomId,
        propertyId: createdHostelId,
        roomNumber: 'DORM-A',
        roomType: 'DORMITORY',
        totalBeds: 4,
        occupiedBeds: 0,
        rentPerBed: 4500,
        securityDeposit: 9000,
        attachedBathroom: false,
        hasBalcony: true,
        airConditioning: false,
        status: 'AVAILABLE',
      });
      assert.strictEqual(room.totalBeds, 4);
      hostelRoomId = roomId;
    }),

    runTest('22. Add BUNK_LOWER and BUNK_UPPER bed inventory items', async () => {
      const lowerBedId = `bed_lower_${Date.now()}`;
      const upperBedId = `bed_upper_${Date.now()}`;

      const lowerBed = await db.createBedInventory({
        id: lowerBedId,
        roomId: hostelRoomId,
        propertyId: createdHostelId,
        bedNumber: 'Bunk-1-Lower',
        bedType: 'BUNK_LOWER',
        rentMonthly: 4500,
        securityDeposit: 9000,
        status: 'AVAILABLE',
        version: 1,
      });

      const upperBed = await db.createBedInventory({
        id: upperBedId,
        roomId: hostelRoomId,
        propertyId: createdHostelId,
        bedNumber: 'Bunk-1-Upper',
        bedType: 'BUNK_UPPER',
        rentMonthly: 4000,
        securityDeposit: 8000,
        status: 'AVAILABLE',
        version: 1,
      });

      assert.strictEqual(lowerBed.bedType, 'BUNK_LOWER');
      assert.strictEqual(upperBed.bedType, 'BUNK_UPPER');
      hostelLowerBedId = lowerBedId;
    }),

    runTest('23. Hostel property detail aggregates rooms and beds hierarchically', async () => {
      const prop = await db.findPropertyById(createdHostelId);
      assert.ok(prop?.rooms, 'Property must include rooms');
      assert.strictEqual(prop?.rooms?.length, 1);
      assert.strictEqual(prop?.rooms[0].beds?.length, 2, 'Room must nest its bed inventory');
    }),

    // -------------------------------------------------------------------------
    // 7. Shared Room Listing (Test 24)
    // -------------------------------------------------------------------------
    runTest('24. Create SHARED_ROOM property with bed-level inventory', async () => {
      const propId = `prop_shared_${Date.now()}`;
      await db.createProperty({
        id: propId,
        ownerId: testOwnerId,
        title: 'Co-living Shared Master Suite',
        bhk: '1 BHK',
        rentMonthly: 7000,
        securityDeposit: 14000,
        locality: 'Sector A',
        city: 'Naharlagun',
        propertyType: 'Shared Room',
        category: 'SHARED_ROOM',
        totalUnits: 2,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });
      createdSharedRoomId = propId;
      const found = await db.findPropertyById(propId);
      assert.strictEqual(found?.category, 'SHARED_ROOM');
    }),

    // -------------------------------------------------------------------------
    // 8. Concurrency & Atomic Bed Booking (Tests 25-26)
    // -------------------------------------------------------------------------
    runTest('25. Atomic bed state transition increments version and sets OCCUPIED', async () => {
      const result = await db.updateBedStatus(hostelLowerBedId, 'OCCUPIED', testCustomerId, 1);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.bed?.status, 'OCCUPIED');
      assert.strictEqual(result.bed?.version, 2, 'Version must increment to 2');
      assert.strictEqual(result.bed?.tenantId, testCustomerId);
    }),

    runTest('26. Concurrency conflict rejected when outdated version (optimistic lock) is provided', async () => {
      // Trying to update with stale version 1 when DB version is now 2
      const conflictResult = await db.updateBedStatus(hostelLowerBedId, 'RESERVED', 'other_user', 1);
      assert.strictEqual(conflictResult.success, false, 'Stale version must fail');
      assert.ok(conflictResult.error?.includes('CONCURRENCY_CONFLICT'), 'Error must indicate concurrency conflict');
    }),

    // -------------------------------------------------------------------------
    // 9. Capacity Recalculation & Integrity (Test 27)
    // -------------------------------------------------------------------------
    runTest('27. Room occupied_beds automatically synchronizes when bed status changes', async () => {
      const rooms = await db.getPropertyRooms(createdHostelId);
      const dorm = rooms.find((r) => r.id === hostelRoomId);
      assert.strictEqual(dorm?.occupiedBeds, 1, 'Room occupied beds must equal 1 after booking');
    }),

    // -------------------------------------------------------------------------
    // 10. Query & Taxonomy Filtering (Test 28)
    // -------------------------------------------------------------------------
    runTest('28. GET properties filters accurately by category, locality, and rent range', async () => {
      const pgListings = await db.getProperties(undefined, { category: 'PG' });
      assert.ok(pgListings.length >= 1, 'Must return at least 1 PG listing');
      assert.ok(pgListings.every((p) => p.category === 'PG'), 'All returned listings must have category PG');

      const aptings = await db.getProperties(undefined, { category: 'APARTMENT' });
      assert.ok(aptings.every((p) => p.category === 'APARTMENT'), 'All returned listings must have category APARTMENT');

      const rangeListings = await db.getProperties(undefined, { minRent: 8000, maxRent: 15000 });
      assert.ok(rangeListings.every((p) => p.rentMonthly >= 8000 && p.rentMonthly <= 15000));
    }),

    // -------------------------------------------------------------------------
    // 11. Suggestions Reconciliation Verifications (Tests 29-35)
    // -------------------------------------------------------------------------
    runTest('29. Missing category rejected with validation error (No APARTMENT fallback)', () => {
      const missingCategoryPayload = {
        title: 'Property Without Category',
        bhk: '2 BHK',
        rentMonthly: 18000,
        securityDeposit: 36000,
        locality: 'Ganga Sector',
        city: 'Itanagar',
        propertyType: 'Apartment',
        // category is omitted
        totalUnits: 2,
        occupiedUnits: 0,
      };
      const result = propertyCreationSchema.safeParse(missingCategoryPayload);
      assert.strictEqual(result.success, false, 'Payload without category must fail validation');
      if (!result.success) {
        const issues = result.error.issues;
        const categoryIssue = issues.find((i) => i.path.includes('category'));
        assert.ok(categoryIssue, 'Validation error must specifically report missing category');
      }
    }),

    runTest('30. Invalid residential categories (COMMERCIAL, HOTEL) strictly rejected', () => {
      const commercialPayload = {
        title: 'Commercial Office Space',
        bhk: 'Commercial',
        rentMonthly: 45000,
        securityDeposit: 90000,
        locality: 'Main Market',
        city: 'Itanagar',
        propertyType: 'Office',
        category: 'COMMERCIAL',
        totalUnits: 1,
        occupiedUnits: 0,
      };
      assert.strictEqual(propertyCreationSchema.safeParse(commercialPayload).success, false);

      const hotelPayload = {
        ...commercialPayload,
        category: 'HOTEL',
      };
      assert.strictEqual(propertyCreationSchema.safeParse(hotelPayload).success, false);
    }),

    runTest('31. PGAccommodation and Hostel interfaces compile and support accommodation rules', () => {
      // Type compilation test for PGAccommodation
      const pgAcc: import('../../src/types/index').PGAccommodation = {
        id: createdPgId,
        ownerId: testOwnerId,
        title: 'Test PG Space',
        bhk: 'Studio',
        propertyType: 'PG Accommodation',
        category: 'PG',
        locality: 'Chandranagar',
        city: 'Itanagar',
        approximateLat: 27.1,
        approximateLng: 93.6,
        approximateRadiusMeters: 500,
        fullAddressEncrypted: 'encrypted_str',
        maskedAddressPreview: 'Chandranagar, Itanagar',
        rentMonthly: 8000,
        securityDeposit: 16000,
        amenities: ['WIFI'],
        photos: [],
        suitableFor: 'Working professionals',
        requirements: {
          petsAllowed: false,
          maxOccupants: 10,
          vegOnly: true,
          smokingAllowed: false,
          minStayMonths: 3,
        },
        status: 'published',
        createdAt: new Date().toISOString(),
        pgHostelMetadata: {
          propertyId: createdPgId,
          foodIncluded: true,
          mealOfferings: ['BREAKFAST', 'DINNER'],
          dietaryPolicy: 'VEG_ONLY',
          genderPreference: 'MALE_ONLY',
          curfewTime: '22:00',
          gateClosingTime: '22:30',
          noticePeriodDays: 30,
          visitorPolicy: 'ALLOWED_WITH_PASS',
          guestRestrictions: 'NO_OVERNIGHT_GUESTS',
          smokingPolicy: 'STRICTLY_PROHIBITED',
          minStayMonths: 3,
          commonFacilities: ['WIFI', 'RO_WATER'],
          rulesAndRegulations: ['Curfew 10pm'],
        },
      };

      assert.strictEqual(pgAcc.category, 'PG');
      assert.strictEqual(pgAcc.pgHostelMetadata?.visitorPolicy, 'ALLOWED_WITH_PASS');
      assert.strictEqual(pgAcc.pgHostelMetadata?.smokingPolicy, 'STRICTLY_PROHIBITED');

      // Type compilation test for Hostel
      const hostelAcc: import('../../src/types/index').Hostel = {
        id: createdHostelId,
        ownerId: testOwnerId,
        title: 'Youth Hostel',
        bhk: 'Dorm',
        propertyType: 'Hostel',
        category: 'HOSTEL',
        locality: 'Zero Point',
        city: 'Itanagar',
        approximateLat: 27.1,
        approximateLng: 93.6,
        approximateRadiusMeters: 500,
        fullAddressEncrypted: 'enc',
        maskedAddressPreview: 'Zero Point, Itanagar',
        rentMonthly: 4000,
        securityDeposit: 8000,
        amenities: ['LOCKERS'],
        photos: [],
        suitableFor: 'Anyone',
        requirements: {
          petsAllowed: false,
          maxOccupants: 20,
          vegOnly: false,
          smokingAllowed: false,
          minStayMonths: 1,
        },
        status: 'available',
        createdAt: new Date().toISOString(),
      };
      assert.strictEqual(hostelAcc.category, 'HOSTEL');
    }),

    runTest('32. Property units migration 007 attributes exist and persist correctly', async () => {
      const unitId = `unit_attr_test_${Date.now()}`;
      const createdUnit = await db.createPropertyUnit({
        id: unitId,
        propertyId: createdApartmentId,
        unitNumber: 'Flat 401',
        unitType: 'Deluxe Suite',
        floorNumber: 4,
        bhk: '2 BHK',
        bedrooms: 2,
        bathrooms: 2,
        rentMonthly: 24000,
        securityDeposit: 48000,
        status: 'AVAILABLE',
        availabilityStatus: 'AVAILABLE',
        furnishingStatus: 'FULLY_FURNISHED',
        carpetAreaSqft: 1100,
      });

      assert.strictEqual(createdUnit.unitType, 'Deluxe Suite');
      assert.strictEqual(createdUnit.bedrooms, 2);
      assert.strictEqual(createdUnit.bathrooms, 2);
      assert.strictEqual(createdUnit.availabilityStatus, 'AVAILABLE');

      const units = await db.getPropertyUnits(createdApartmentId);
      const found = units.find((u) => u.id === unitId);
      assert.ok(found, 'Created unit must be retrieved');
      assert.strictEqual(found?.unitType, 'Deluxe Suite');
      assert.strictEqual(found?.bedrooms, 2);
      assert.strictEqual(found?.bathrooms, 2);
    }),

    runTest('33. Property units cascade on property deletion maintaining FK integrity', async () => {
      // Create temporary property with unit
      const tempPropId = `prop_temp_${Date.now()}`;
      await db.createProperty({
        id: tempPropId,
        ownerId: testOwnerId,
        title: 'Cascade Deletion Test Prop',
        bhk: '1 BHK',
        rentMonthly: 10000,
        securityDeposit: 20000,
        locality: 'Test Locality',
        city: 'Pasighat',
        propertyType: 'Apartment',
        category: 'APARTMENT',
        totalUnits: 1,
        occupiedUnits: 0,
        status: 'available',
        createdAt: new Date().toISOString(),
      });

      const tempUnitId = `unit_temp_${Date.now()}`;
      await db.createPropertyUnit({
        id: tempUnitId,
        propertyId: tempPropId,
        unitNumber: 'T-101',
        unitType: 'Standard',
        rentMonthly: 10000,
        securityDeposit: 20000,
        status: 'AVAILABLE',
        bedrooms: 1,
        bathrooms: 1,
      });

      // Verify unit exists
      const beforeUnits = await db.getPropertyUnits(tempPropId);
      assert.strictEqual(beforeUnits.length, 1);

      // Delete property
      await db.deleteProperty(tempPropId);

      // Verify unit was cascade deleted
      const afterUnits = await db.getPropertyUnits(tempPropId);
      assert.strictEqual(afterUnits.length, 0, 'Property units must cascade delete when parent property is deleted');
    }),

    runTest('34. Property rooms support PRIVATE_ROOM roomType', async () => {
      const privateRoomId = `room_pvt_${Date.now()}`;
      const room = await db.createPropertyRoom({
        id: privateRoomId,
        propertyId: createdPgId,
        roomNumber: 'PVT-01',
        roomType: 'PRIVATE_ROOM',
        totalBeds: 1,
        occupiedBeds: 0,
        rentPerBed: 11000,
        securityDeposit: 22000,
        attachedBathroom: true,
        hasBalcony: true,
        airConditioning: true,
        status: 'AVAILABLE',
      });
      assert.strictEqual(room.roomType, 'PRIVATE_ROOM');
    }),

    runTest('35. Historical pre-existing property (lst_2) category is APARTMENT and units intact', async () => {
      const lst2 = await db.findPropertyById('lst_2');
      assert.ok(lst2, 'lst_2 must exist');
      assert.strictEqual(lst2.category, 'APARTMENT');
      assert.ok(lst2.title, 'Title preserved');
      assert.ok(lst2.locality, 'Locality preserved');
    }),
  ];

  for (const test of tests) {
    await test();
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Step 5A Test Results: ${passedCount} PASSED, ${failedCount} FAILED (Total: ${tests.length})`);
  console.log('----------------------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
