// Production-Grade Cryptographic & Authentication Utilities for NivasPay
// Uses standard Web Crypto API (SubtleCrypto) with PBKDF2-SHA256 (100,000 iterations)

/**
 * Generate a cryptographically secure 16-byte random salt as hex string
 */
export function generateSalt(byteLength: number = 16): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derive a 256-bit PBKDF2 key hash with SHA-256 and 100,000 rounds
 */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const saltBytes = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison to prevent timing side-channel attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify plaintext password against stored salt and PBKDF2 hash
 */
export async function verifyPassword(
  password: string,
  saltHex: string,
  storedHashHex: string
): Promise<boolean> {
  try {
    const computedHash = await hashPassword(password, saltHex);
    return constantTimeCompare(computedHash, storedHashHex);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure session or reset token
 */
export function generateSecureToken(byteLength: number = 32): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fast SHA-256 hash for reset tokens so they are never stored in plaintext
 */
export async function hashToken(token: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Password complexity validation:
 * - At least 8 characters
 * - At least one letter
 * - At least one digit
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number.' };
  }
  return { valid: true };
}

/**
 * Email validation and sanitization
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function sanitizeEmail(email: string): string {
  return email ? email.trim().toLowerCase() : '';
}
