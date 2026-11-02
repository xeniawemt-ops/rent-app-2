import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/authService';
import { db } from '../db/database';

export type PrimaryRole = 'CUSTOMER' | 'OWNER' | 'ADMIN';
export type UserRoleType = PrimaryRole;

export type BrokerMembershipRole = 'BROKER_ADMIN' | 'BROKER_STAFF';
export type StaffMembershipRole = 'NIVASPAY_RM' | 'OPERATIONS_MANAGER';
export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export type Permission =
  // Property permissions
  | 'properties:read'
  | 'properties:create'
  | 'properties:update'
  | 'properties:delete'
  // Application permissions
  | 'applications:create'
  | 'applications:read'
  | 'applications:review'
  | 'applications:manage'
  // Payment permissions
  | 'payments:initiate'
  | 'payments:verify'
  | 'payments:read'
  | 'payments:refund'
  // Broker & Agency permissions
  | 'agency:manage'
  | 'agency:staff:manage'
  | 'agency:listings:create'
  | 'agency:listings:read'
  | 'agency:leads:read'
  | 'agency:leads:assign'
  | 'agency:commissions:read'
  | 'visits:schedule'
  | 'visits:record_outcome'
  // Relationship Manager (RM) permissions
  | 'rm:assigned_customers:read'
  | 'rm:visits:coordinate'
  | 'rm:notes:log'
  | 'rm:cases:escalate'
  // Operations Manager permissions
  | 'ops:verifications:review'
  | 'ops:disputes:manage'
  | 'ops:cases:reassign'
  | 'ops:metrics:read'
  | 'ops:refunds:initiate'
  // Grievance / Report permissions
  | 'reports:create'
  | 'reports:read'
  | 'reports:manage'
  // Admin & Audit permissions
  | 'audit:read'
  | 'users:manage'
  | 'system:configure';

export type AllRoleType = PrimaryRole | BrokerMembershipRole | StaffMembershipRole;

/**
 * Standard Role-Based Permission Matrix for primary roles and delegated secondary memberships
 */
export const ROLE_PERMISSIONS: Record<AllRoleType, Permission[]> = {
  ADMIN: [
    'properties:read',
    'properties:create',
    'properties:update',
    'properties:delete',
    'applications:create',
    'applications:read',
    'applications:review',
    'applications:manage',
    'payments:initiate',
    'payments:verify',
    'payments:read',
    'payments:refund',
    'agency:manage',
    'agency:staff:manage',
    'agency:listings:create',
    'agency:listings:read',
    'agency:leads:read',
    'agency:leads:assign',
    'agency:commissions:read',
    'visits:schedule',
    'visits:record_outcome',
    'rm:assigned_customers:read',
    'rm:visits:coordinate',
    'rm:notes:log',
    'rm:cases:escalate',
    'ops:verifications:review',
    'ops:disputes:manage',
    'ops:cases:reassign',
    'ops:metrics:read',
    'ops:refunds:initiate',
    'reports:create',
    'reports:read',
    'reports:manage',
    'audit:read',
    'users:manage',
    'system:configure',
  ],
  OWNER: [
    'properties:read',
    'properties:create',
    'properties:update',
    'properties:delete',
    'applications:read',
    'applications:review',
    'payments:read',
    'payments:refund',
    'reports:read',
  ],
  CUSTOMER: [
    'properties:read',
    'applications:create',
    'applications:read',
    'payments:initiate',
    'payments:verify',
    'payments:read',
    'reports:create',
    'reports:read',
  ],
  BROKER_ADMIN: [
    'properties:read',
    'agency:manage',
    'agency:staff:manage',
    'agency:listings:create',
    'agency:listings:read',
    'agency:leads:read',
    'agency:leads:assign',
    'agency:commissions:read',
    'visits:schedule',
    'visits:record_outcome',
    'payments:read',
  ],
  BROKER_STAFF: [
    'properties:read',
    'agency:listings:read',
    'agency:leads:read',
    'visits:schedule',
    'visits:record_outcome',
  ],
  NIVASPAY_RM: [
    'properties:read',
    'applications:read',
    'rm:assigned_customers:read',
    'rm:visits:coordinate',
    'rm:notes:log',
    'rm:cases:escalate',
  ],
  OPERATIONS_MANAGER: [
    'properties:read',
    'applications:read',
    'applications:manage',
    'ops:verifications:review',
    'ops:disputes:manage',
    'ops:cases:reassign',
    'ops:metrics:read',
    'ops:refunds:initiate',
    'payments:read',
    'payments:refund',
    'reports:read',
    'reports:manage',
    'audit:read',
  ],
};

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  brokerMembership?: any;
  staffMembership?: any;
}

/**
 * Middleware: requireAuth
 * Extracts JWT token from Authorization header (Bearer <token>) or HTTP-only cookie,
 * verifies it using JWT secret, and attaches the decoded user payload to req.user.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.nivaspay_token) {
      token = req.cookies.nivaspay_token;
    }

    if (!token) {
      return res.status(401).json({
        error: '401_UNAUTHORIZED: Authentication token missing. Please provide a Bearer token or sign in.',
      });
    }

    const payload = AuthService.verifyToken(token);
    if (!payload || !payload.id || !payload.role) {
      return res.status(401).json({
        error: '401_UNAUTHORIZED: Invalid token payload.',
      });
    }

    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: '401_TOKEN_EXPIRED: Your session has expired. Please sign in again.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: `401_INVALID_TOKEN: Invalid authentication token (${err.message}).`,
      });
    }
    return res.status(401).json({
      error: `401_UNAUTHORIZED: Authentication failed (${err.message || 'Unknown error'}).`,
    });
  }
}

/**
 * Middleware: requireRole
 * Enforces that the authenticated user possesses one of the allowed primary roles (or ADMIN).
 * Supports single role or array of allowed roles.
 */
export function requireRole(...allowedRoles: (UserRoleType | UserRoleType[] | string | string[])[]) {
  const roles = allowedRoles.flat();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: '401_UNAUTHORIZED: Authentication required before checking permissions.',
      });
    }

    // ADMIN role possesses access across all administrative and operational endpoints
    if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) {
      return next();
    }

    db.logAudit({
      userId: req.user.id,
      action: 'ROLE_ACCESS_DENIED',
      category: 'AUTH',
      details: `Role ${req.user.role} attempted access to route requiring ${roles.join(', ')}`,
    });

    return res.status(403).json({
      error: `403_FORBIDDEN: Access denied. Required role(s): ${roles.join(', ')}. Current role: ${req.user.role}.`,
    });
  };
}

/**
 * Middleware: requireBrokerMembership
 * Enforces delegated access to Broker Agency resources.
 * Requires that the authenticated user possesses an ACTIVE broker membership
 * in an authorized agency (or Super Admin authority).
 */
export function requireBrokerMembership(...allowedRoles: (BrokerMembershipRole | BrokerMembershipRole[])[]) {
  const roles = allowedRoles.length > 0 ? allowedRoles.flat() : (['BROKER_ADMIN', 'BROKER_STAFF'] as BrokerMembershipRole[]);

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: '401_UNAUTHORIZED: Authentication required before checking broker permissions.',
      });
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const membership = await db.findBrokerMembershipByUserId(req.user.id);
    if (!membership) {
      db.logAudit({
        userId: req.user.id,
        action: 'BROKER_MEMBERSHIP_REQUIRED',
        category: 'AUTH',
        details: `User ${req.user.id} (${req.user.role}) denied access: No broker membership found`,
      });
      return res.status(403).json({
        error: 'Access denied: Broker credentials required. Please sign in via the appropriate portal.',
      });
    }

    if (membership.status === 'REVOKED') {
      db.logAudit({
        userId: req.user.id,
        action: 'REVOKED_MEMBERSHIP_ACCESS_BLOCKED',
        category: 'AUTH',
        details: `User ${req.user.id} denied access: Broker membership is REVOKED`,
      });
      return res.status(403).json({
        error: 'Access denied: Broker membership has been revoked.',
      });
    }

    if (membership.status === 'SUSPENDED') {
      db.logAudit({
        userId: req.user.id,
        action: 'SUSPENDED_MEMBERSHIP_ACCESS_BLOCKED',
        category: 'AUTH',
        details: `User ${req.user.id} denied access: Broker membership is SUSPENDED`,
      });
      return res.status(403).json({
        error: 'Access denied: Broker membership is currently suspended.',
      });
    }

    if (roles.length > 0 && !roles.includes(membership.membershipRole)) {
      return res.status(403).json({
        error: `Access denied: Required broker role(s): ${roles.join(', ')}. Current role: ${membership.membershipRole}.`,
      });
    }

    req.brokerMembership = membership;
    next();
  };
}

/**
 * Middleware: requireStaffMembership
 * Enforces delegated access to NivasPay Internal Staff workspaces (RM / Operations).
 * Requires that the authenticated user possesses an ACTIVE internal staff membership
 * (or Super Admin authority).
 */
export function requireStaffMembership(...allowedRoles: (StaffMembershipRole | StaffMembershipRole[])[]) {
  const roles = allowedRoles.length > 0 ? allowedRoles.flat() : (['NIVASPAY_RM', 'OPERATIONS_MANAGER'] as StaffMembershipRole[]);

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: '401_UNAUTHORIZED: Authentication required before checking staff permissions.',
      });
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const membership = await db.findStaffMembershipByUserId(req.user.id);
    if (!membership) {
      db.logAudit({
        userId: req.user.id,
        action: 'STAFF_MEMBERSHIP_REQUIRED',
        category: 'AUTH',
        details: `User ${req.user.id} (${req.user.role}) denied access: No staff membership found`,
      });
      return res.status(403).json({
        error: 'Access denied: NivasPay Staff credentials required.',
      });
    }

    if (membership.status === 'REVOKED') {
      db.logAudit({
        userId: req.user.id,
        action: 'REVOKED_STAFF_ACCESS_BLOCKED',
        category: 'AUTH',
        details: `User ${req.user.id} denied access: Staff membership is REVOKED`,
      });
      return res.status(403).json({
        error: 'Access denied: Staff membership has been revoked.',
      });
    }

    if (membership.status === 'SUSPENDED') {
      db.logAudit({
        userId: req.user.id,
        action: 'SUSPENDED_STAFF_ACCESS_BLOCKED',
        category: 'AUTH',
        details: `User ${req.user.id} denied access: Staff membership is SUSPENDED`,
      });
      return res.status(403).json({
        error: 'Access denied: Staff membership is currently suspended.',
      });
    }

    if (roles.length > 0 && !roles.includes(membership.staffRole)) {
      return res.status(403).json({
        error: `Access denied: Required staff role(s): ${roles.join(', ')}. Current role: ${membership.staffRole}.`,
      });
    }

    req.staffMembership = membership;
    next();
  };
}

/**
 * Middleware: requirePermission
 * Checks whether the user's role grants specific permission(s).
 * Supports checking single permission or multiple required permissions (all required by default).
 */
export function requirePermission(
  requiredPermissions: Permission | Permission[],
  matchMode: 'ALL' | 'ANY' = 'ALL'
) {
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: '401_UNAUTHORIZED: Authentication required before checking permissions.',
      });
    }

    const userPermissions = (ROLE_PERMISSIONS as any)[req.user.role] || [];

    const hasPermission =
      matchMode === 'ALL'
        ? perms.every((p) => userPermissions.includes(p))
        : perms.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      db.logAudit({
        userId: req.user.id,
        action: 'PERMISSION_DENIED',
        category: 'AUTH',
        details: `User ${req.user.id} (${req.user.role}) lacked permission(s): ${perms.join(', ')}`,
      });

      return res.status(403).json({
        error: `403_FORBIDDEN: Insufficient permissions. Required: ${perms.join(', ')}.`,
      });
    }

    next();
  };
}
