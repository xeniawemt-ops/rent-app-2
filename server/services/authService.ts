import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { db, DBUser } from '../db/database';

const SALT_ROUNDS = 12;

import { UserRoleType } from '../middleware/auth';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRoleType;
  fullName: string;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateToken(user: DBUser): string {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
    return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '8h' });
  }

  public static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, ENV.JWT_SECRET) as TokenPayload;
  }

  public static async authenticateUser(email: string, password: string): Promise<{ user: DBUser; token: string }> {
    const user = await db.findUserByEmail(email);
    if (!user) {
      throw new Error('401_INVALID_CREDENTIALS: User not found');
    }
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await db.logAudit({ userId: user.id, action: 'LOGIN_FAILED', category: 'AUTH', details: `Failed login attempt for ${email}` });
      throw new Error('401_INVALID_CREDENTIALS: Incorrect password');
    }

    const token = this.generateToken(user);
    await db.logAudit({ userId: user.id, action: 'LOGIN_SUCCESS', category: 'AUTH', details: `User ${email} logged in successfully` });
    return { user, token };
  }
}
