import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db, DBProperty, DBPropertyUnit, DBPropertyRoom, DBBedInventoryItem, DBPgHostelMetadata } from '../db/database';
import {
  propertyCreationSchema,
  propertyQuerySchema,
  propertyUnitCreationSchema,
  propertyRoomCreationSchema,
  bedInventoryCreationSchema,
  pgHostelMetadataSchema,
} from '../utils/validation';

export class PropertyController {
  public static async getProperties(req: AuthenticatedRequest, res: Response) {
    try {
      const queryResult = propertyQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          error: 'INVALID_QUERY_PARAMETERS',
          details: queryResult.error.flatten(),
        });
      }

      const q = queryResult.data;
      const ownerId = req.user?.role === 'OWNER' && q.ownerOnly === 'true' ? req.user.id : undefined;

      const properties = await db.getProperties(ownerId, {
        category: q.category,
        locality: q.locality,
        city: q.city,
        minRent: q.minRent,
        maxRent: q.maxRent,
        bhk: q.bhk,
        accommodationType: q.accommodationType,
      });

      return res.json({ success: true, properties, count: properties.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve properties' });
    }
  }

  public static async getPropertyById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const property = await db.findPropertyById(id);
      if (!property) {
        return res.status(404).json({ error: `404_NOT_FOUND: Property ${id} not found.` });
      }

      // Privacy & DPDP Act compliance:
      // If caller is NOT the owner of the property and NOT an admin,
      // mask private tenant identifiers in beds
      const isAuthorizedOwner = req.user && (req.user.role === 'ADMIN' || req.user.id === property.ownerId);

      const sanitizedProperty = { ...property };
      if (!isAuthorizedOwner) {
        if (sanitizedProperty.beds) {
          sanitizedProperty.beds = sanitizedProperty.beds.map((b) => ({
            ...b,
            tenantId: undefined, // Mask private resident ID
          }));
        }
        if (sanitizedProperty.rooms) {
          sanitizedProperty.rooms = sanitizedProperty.rooms.map((r) => ({
            ...r,
            beds: r.beds?.map((b) => ({
              ...b,
              tenantId: undefined,
            })),
          }));
        }
      }

      return res.json({ success: true, property: sanitizedProperty });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve property' });
    }
  }

  public static async createProperty(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
        return res.status(403).json({ error: 'Only property owners or administrators can create listings.' });
      }

      const parseResult = propertyCreationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'VALIDATION_FAILED: Invalid property payload',
          details: parseResult.error.flatten(),
        });
      }

      const data = parseResult.data;
      const propertyId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newProperty: DBProperty = {
        id: propertyId,
        ownerId: user.id,
        title: data.title,
        bhk: data.bhk,
        rentMonthly: data.rentMonthly,
        securityDeposit: data.securityDeposit,
        locality: data.locality,
        city: data.city,
        propertyType: data.propertyType,
        category: data.category,
        totalUnits: data.totalUnits,
        occupiedUnits: data.occupiedUnits,
        status: data.status,
        amenities: data.amenities || [],
        photos: Array.isArray(data.photos) ? data.photos : (data.photos ? [data.photos] : []),
        requirements: data.requirements || {},
        approximateLat: data.approximateLat,
        approximateLng: data.approximateLng,
        fullAddressEncrypted: data.fullAddressEncrypted,
        maskedAddressPreview: data.maskedAddressPreview || `${data.locality}, ${data.city}`,
        createdAt: new Date().toISOString(),
      };

      const saved = await db.createProperty(newProperty);

      // Handle optional initial units
      if (Array.isArray(req.body.units) && req.body.units.length > 0) {
        for (const u of req.body.units) {
          const parsedUnit = propertyUnitCreationSchema.safeParse(u);
          if (parsedUnit.success) {
            await db.createPropertyUnit({
              id: `unit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              propertyId: saved.id,
              ...parsedUnit.data,
            });
          }
        }
      }

      // Handle optional initial rooms
      if (Array.isArray(req.body.rooms) && req.body.rooms.length > 0) {
        for (const r of req.body.rooms) {
          const parsedRoom = propertyRoomCreationSchema.safeParse(r);
          if (parsedRoom.success) {
            await db.createPropertyRoom({
              id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              propertyId: saved.id,
              ...parsedRoom.data,
            });
          }
        }
      }

      // Handle optional initial PG/Hostel metadata
      if (req.body.pgMetadata && typeof req.body.pgMetadata === 'object') {
        const parsedMeta = pgHostelMetadataSchema.safeParse(req.body.pgMetadata);
        if (parsedMeta.success) {
          await db.upsertPgHostelMetadata({
            propertyId: saved.id,
            ...parsedMeta.data,
          });
        }
      }

      await db.logAudit({
        userId: user.id,
        action: 'PROPERTY_CREATED',
        category: 'PROPERTY',
        details: `Created listing: ${saved.id} (${saved.title}) [${saved.category}] with rent ₹${saved.rentMonthly}`,
      });

      const fullProperty = await db.findPropertyById(saved.id);
      return res.status(201).json({ success: true, property: fullProperty || saved });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Property creation failed' });
    }
  }

  public static async updateProperty(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      const existing = await db.findPropertyById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Property not found' });
      }

      if (user?.role !== 'ADMIN' && existing.ownerId !== user?.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You do not own this property.' });
      }

      const updated = await db.updateProperty(id, req.body);
      return res.json({ success: true, property: updated });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Property update failed' });
    }
  }

  public static async deleteProperty(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      const existing = await db.findPropertyById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Property not found' });
      }

      if (user?.role !== 'ADMIN' && existing.ownerId !== user?.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You do not own this property.' });
      }

      await db.deleteProperty(id);
      return res.json({ success: true, message: 'Property deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Property deletion failed' });
    }
  }

  // ============================================================================
  // Sub-Entity Handlers: Units, Rooms, Beds & PG/Hostel Metadata
  // ============================================================================

  public static async addUnit(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      const property = await db.findPropertyById(id);
      if (!property) {
        return res.status(404).json({ error: `404_NOT_FOUND: Property ${id} not found.` });
      }

      if (user?.role !== 'ADMIN' && property.ownerId !== user?.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You do not own this property.' });
      }

      const parseResult = propertyUnitCreationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      }

      const unitId = `unit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newUnit: DBPropertyUnit = {
        id: unitId,
        propertyId: id,
        ...parseResult.data,
      };

      const created = await db.createPropertyUnit(newUnit);
      return res.status(201).json({ success: true, unit: created });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add unit' });
    }
  }

  public static async addRoom(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      const property = await db.findPropertyById(id);
      if (!property) {
        return res.status(404).json({ error: `404_NOT_FOUND: Property ${id} not found.` });
      }

      if (user?.role !== 'ADMIN' && property.ownerId !== user?.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You do not own this property.' });
      }

      const parseResult = propertyRoomCreationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newRoom: DBPropertyRoom = {
        id: roomId,
        propertyId: id,
        ...parseResult.data,
      };

      const created = await db.createPropertyRoom(newRoom);
      return res.status(201).json({ success: true, room: created });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add room' });
    }
  }

  public static async addBed(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id, roomId } = req.params;
      const property = await db.findPropertyById(id);
      if (!property) {
        return res.status(404).json({ error: `404_NOT_FOUND: Property ${id} not found.` });
      }

      if (user?.role !== 'ADMIN' && property.ownerId !== user?.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You do not own this property.' });
      }

      const parseResult = bedInventoryCreationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      }

      const bedId = `bed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newBed: DBBedInventoryItem = {
        id: bedId,
        roomId,
        propertyId: id,
        ...parseResult.data,
        version: 1,
      };

      const created = await db.createBedInventory(newBed);
      return res.status(201).json({ success: true, bed: created });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to add bed' });
    }
  }

  public static async upsertPgMetadata(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      const property = await db.findPropertyById(id);
      if (!property) {
        return res.status(404).json({ error: `404_NOT_FOUND: Property ${id} not found.` });
      }

      if (user?.role !== 'ADMIN' && property.ownerId !== user?.id) {
        return res.status(403).json({ error: '403_FORBIDDEN: You do not own this property.' });
      }

      const parseResult = pgHostelMetadataSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      }

      const metadata: DBPgHostelMetadata = {
        propertyId: id,
        ...parseResult.data,
      };

      const saved = await db.upsertPgHostelMetadata(metadata);
      return res.json({ success: true, pgMetadata: saved });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to save PG metadata' });
    }
  }

  public static async updateBedStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id, bedId } = req.params;
      const { status, tenantId, expectedVersion } = req.body;

      if (!status || !['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'].includes(status)) {
        return res.status(400).json({ error: 'Invalid bed status' });
      }

      const property = await db.findPropertyById(id);
      if (!property) {
        return res.status(404).json({ error: `404_NOT_FOUND: Property ${id} not found.` });
      }

      // Customer can book an available bed; Owner/Admin can alter any bed
      const isOwnerOrAdmin = user && (user.role === 'ADMIN' || user.id === property.ownerId);
      const isCustomerBooking = user?.role === 'CUSTOMER' && status === 'OCCUPIED';

      if (!isOwnerOrAdmin && !isCustomerBooking) {
        return res.status(403).json({ error: '403_FORBIDDEN: Unauthorized to modify bed inventory.' });
      }

      const assignedTenant = isCustomerBooking ? user.id : (tenantId !== undefined ? tenantId : null);

      const result = await db.updateBedStatus(bedId, status, assignedTenant, expectedVersion);
      if (!result.success) {
        if (result.error?.includes('CONCURRENCY_CONFLICT')) {
          return res.status(409).json({ error: result.error });
        }
        return res.status(400).json({ error: result.error || 'Failed to update bed' });
      }

      return res.json({ success: true, bed: result.bed });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to update bed status' });
    }
  }

  // ============================================================================
  // Saved / Favorites Handlers
  // ============================================================================

  public static async getSavedProperties(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const properties = await db.getSavedProperties(user.id);
      return res.json({ success: true, properties });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to retrieve saved properties' });
    }
  }

  public static async saveProperty(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      await db.saveProperty(user.id, id);
      return res.json({ success: true, message: 'Property saved to favorites' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to save property' });
    }
  }

  public static async unsaveProperty(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;
      const { id } = req.params;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      await db.unsaveProperty(user.id, id);
      return res.json({ success: true, message: 'Property removed from favorites' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to remove property from favorites' });
    }
  }
}
