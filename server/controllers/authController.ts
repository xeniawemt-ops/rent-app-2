import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/authService';
import { db, DBUser } from '../db/database';
import { userLoginSchema, userRegistrationSchema, formatZodErrors } from '../utils/validation';
import { adminAuth } from '../../src/lib/firebase-admin';

export class AuthController {
  public static async login(req: Request, res: Response) {
    try {
      const { email, password, expectedRole } = userLoginSchema.parse(req.body);
      const { user, token } = await AuthService.authenticateUser(email, password);

      // Enforce cross-role isolation if expectedRole was specified
      if (expectedRole && user.role !== 'ADMIN') {
        if (expectedRole === 'OWNER' && user.role === 'CUSTOMER') {
          return res.status(403).json({
            error: 'Access denied: Customer and Owner accounts are separate. Please sign in via NivasPay Homes.',
          });
        }
        if (expectedRole === 'CUSTOMER' && user.role === 'OWNER') {
          return res.status(403).json({
            error: 'Access denied: Customer and Owner accounts are separate. Please sign in via NivasPay Owner.',
          });
        }
        if (expectedRole === 'BROKER_ADMIN' || expectedRole === 'BROKER_STAFF') {
          const brokerMembership = await db.findBrokerMembershipByUserId(user.id);
          if (!brokerMembership) {
            return res.status(403).json({
              error: 'Access denied: Broker credentials required. Please sign in via the appropriate portal.',
            });
          }
          if (brokerMembership.status === 'SUSPENDED') {
            return res.status(403).json({
              error: 'Access denied: Your broker membership is SUSPENDED. Please contact your agency administrator or NivasPay operations.',
            });
          }
          if (brokerMembership.status === 'REVOKED') {
            return res.status(403).json({
              error: 'Access denied: Your broker membership is REVOKED.',
            });
          }
          if (expectedRole === 'BROKER_ADMIN' && brokerMembership.membershipRole !== 'BROKER_ADMIN') {
            return res.status(403).json({
              error: 'Access denied: Broker Administrator privileges required.',
            });
          }
        }
        if (expectedRole === 'NIVASPAY_RM' || expectedRole === 'OPERATIONS_MANAGER') {
          const staffMembership = await db.findStaffMembershipByUserId(user.id);
          if (!staffMembership) {
            return res.status(403).json({
              error: 'Access denied: NivasPay Staff credentials required.',
            });
          }
          if (staffMembership.status === 'SUSPENDED') {
            return res.status(403).json({
              error: 'Access denied: Your staff membership is SUSPENDED. Please contact system operations.',
            });
          }
          if (staffMembership.status === 'REVOKED') {
            return res.status(403).json({
              error: 'Access denied: Your staff membership is REVOKED.',
            });
          }
          if (expectedRole !== staffMembership.staffRole) {
            return res.status(403).json({
              error: `Access denied: ${expectedRole} credentials required.`,
            });
          }
        }
        if (expectedRole === 'ADMIN') {
          return res.status(403).json({
            error: 'Access denied: Administrator privileges required.',
          });
        }
      }

      const [brokerMembership, staffMembership] = await Promise.all([
        db.findBrokerMembershipByUserId(user.id),
        db.findStaffMembershipByUserId(user.id),
      ]);

      res.cookie('nivaspay_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 3600 * 1000,
      });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          brokerMembership,
          staffMembership,
        },
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  public static async signup(req: Request, res: Response) {
    try {
      const data = userRegistrationSchema.parse(req.body);
      const existing = await db.findUserByEmail(data.email);
      if (existing) {
        if (data.role === 'OWNER' && existing.role === 'CUSTOMER') {
          return res.status(400).json({
            error: 'This account is already registered as a NivasPay customer. Customer and Owner accounts are separate. Please use your existing account for customer services.',
          });
        }
        if (data.role === 'CUSTOMER' && existing.role === 'OWNER') {
          return res.status(400).json({
            error: 'This account is already registered as a NivasPay owner. Customer and Owner accounts are separate. Please use your existing account for owner services.',
          });
        }
        return res.status(400).json({ error: '400_CONFLICT: Email already registered.' });
      }

      const passwordHash = await AuthService.hashPassword(data.password);
      const newUser: DBUser = {
        id: `user_${data.role.toLowerCase()}_${Date.now()}`,
        email: data.email,
        passwordHash,
        role: data.role,
        fullName: data.fullName,
        phone: data.phone || undefined,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };

      await db.createUser(newUser);
      const token = AuthService.generateToken(newUser);

      await db.logAudit({
        userId: newUser.id,
        action: 'USER_REGISTERED',
        category: 'AUTH',
        details: `New ${data.role} registered: ${data.email}`,
      });

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const formatted = formatZodErrors(err);
        return res.status(400).json({ error: formatted.message, fieldErrors: formatted.fieldErrors });
      }
      return res.status(400).json({ error: err.message });
    }
  }

  public static async googleLogin(req: Request, res: Response) {
    try {
      const { idToken, targetRole } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: 'Missing Firebase ID token.' });
      }

      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email || `${uid}@firebase.user`;
      const name = decodedToken.name || '';

      let user = await db.findUserById(uid);
      if (!user) {
        user = await db.findUserByEmail(email);
      }

      if (!user) {
        const newUser: DBUser = {
          id: uid,
          email,
          passwordHash: '',
          role: targetRole === 'OWNER' ? 'OWNER' : 'CUSTOMER',
          fullName: name || 'Google User',
          phone: undefined,
          isVerified: true,
          createdAt: new Date().toISOString(),
        };
        await db.createUser(newUser);
        user = newUser;

        await db.logAudit({
          userId: newUser.id,
          action: 'USER_REGISTERED_GOOGLE',
          category: 'AUTH',
          details: `Google user registered: ${email} as ${newUser.role}`,
        });
      }

      const token = AuthService.generateToken(user);

      res.cookie('nivaspay_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 3600 * 1000,
      });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      });
    } catch (err: any) {
      console.error('Error during Google authentication:', err);
      return res.status(401).json({ error: 'Unauthorized: Invalid token or failed authentication' });
    }
  }

  public static async refresh(req: Request, res: Response) {
    try {
      const incomingToken =
        req.cookies?.nivaspay_token ||
        (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null) ||
        (req.body && req.body.token ? req.body.token : null);

      if (!incomingToken) {
        return res.status(401).json({ error: '401_UNAUTHORIZED: Missing session token for refresh.' });
      }

      let payload: any;
      try {
        payload = AuthService.verifyToken(incomingToken);
      } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
          payload = jwt.decode(incomingToken);
        } else {
          return res.status(401).json({ error: '401_UNAUTHORIZED: Invalid token signature.' });
        }
      }

      if (!payload || !payload.id) {
        return res.status(401).json({ error: '401_UNAUTHORIZED: Invalid token payload.' });
      }

      const user = await db.findUserById(payload.id);
      if (!user) {
        return res.status(401).json({ error: '401_UNAUTHORIZED: User account no longer exists.' });
      }

      const newToken = AuthService.generateToken(user);

      res.cookie('nivaspay_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 3600 * 1000,
      });

      const [brokerMembership, staffMembership] = await Promise.all([
        db.findBrokerMembershipByUserId(user.id),
        db.findStaffMembershipByUserId(user.id),
      ]);

      return res.json({
        success: true,
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          brokerMembership,
          staffMembership,
        },
      });
    } catch (err: any) {
      return res.status(401).json({ error: err.message || 'Token renewal failed.' });
    }
  }

  public static logout(req: Request, res: Response) {
    res.clearCookie('nivaspay_token');
    return res.json({ success: true, message: 'Logged out successfully.' });
  }

  public static async me(req: any, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const [user, brokerMembership, staffMembership] = await Promise.all([
      db.findUserById(req.user.id),
      db.findBrokerMembershipByUserId(req.user.id),
      db.findStaffMembershipByUserId(req.user.id),
    ]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      brokerMembership,
      staffMembership,
    });
  }
}
