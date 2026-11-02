// Sliding Window Rate Limiter for NivasPay Authentication & Account Protection
// Mitigates automated brute-force attacks, credential stuffing, and account enumeration.

export interface RateLimitRuleConfig {
  maxRequests: number;
  windowMs: number;
  description: string;
}

export interface RateLimitResult {
  allowed: boolean;
  currentRequests: number;
  maxRequests: number;
  windowSeconds: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number; // epoch timestamp ms
  ruleKey: string;
}

/**
 * Standard security threshold rules for authentication endpoints.
 * Sliding window enforces request budgets over rolling intervals.
 */
export const DEFAULT_RATE_LIMIT_RULES: Record<string, RateLimitRuleConfig> = {
  // Authentication / Login:
  // IP limit: Max 10 attempts per 60 seconds (stops automated credential testing from single origin)
  'auth_login_ip': {
    maxRequests: 10,
    windowMs: 60 * 1000,
    description: 'Login attempts per IP address',
  },
  // Account limit: Max 5 attempts per 60 seconds per targeted email (stops targeted account password guessing)
  'auth_login_account': {
    maxRequests: 5,
    windowMs: 60 * 1000,
    description: 'Login attempts per targeted account email',
  },

  // Account Creation / Signup:
  // IP limit: Max 5 signups per 5 minutes per IP (prevents mass bot registration)
  'auth_signup_ip': {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    description: 'Account registrations per IP address',
  },
  // Email limit: Max 3 signup attempts per 5 minutes for identical email (prevents enumeration probes)
  'auth_signup_email': {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000,
    description: 'Signup attempts per email address',
  },

  // Password Recovery / Forgot Password:
  // IP limit: Max 5 recovery requests per 5 minutes per IP (prevents email harvesting sweeps)
  'auth_pwd_recovery_ip': {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    description: 'Password recovery dispatch requests per IP address',
  },
  // Email limit: Max 3 recovery requests per 5 minutes for the same email (stops inbox denial-of-service)
  'auth_pwd_recovery_email': {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000,
    description: 'Password recovery requests per targeted email',
  },

  // Password Reset / Token Submission:
  // IP limit: Max 5 reset submissions per 5 minutes per IP (prevents token brute-forcing)
  'auth_pwd_reset_ip': {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    description: 'Password reset submissions per IP address',
  },
};

export class SlidingWindowRateLimiter {
  // In-memory sliding window timestamp logs: key -> array of unix epoch timestamps (ms)
  private timestampLogs: Map<string, number[]> = new Map();

  // Rules registry
  private rules: Map<string, RateLimitRuleConfig> = new Map();

  constructor(customRules: Record<string, RateLimitRuleConfig> = DEFAULT_RATE_LIMIT_RULES) {
    Object.entries(customRules).forEach(([key, config]) => {
      this.rules.set(key, config);
    });
  }

  /**
   * Evaluates an action against a specific sliding window rule.
   *
   * Sliding Window Algorithm:
   * 1. Window bounds: [now - windowMs, now]
   * 2. Evict timestamps strictly older than (now - windowMs)
   * 3. Count remaining timestamps within window
   * 4. If count >= maxRequests: reject request and compute retryAfterSeconds based on oldest timestamp
   * 5. If count < maxRequests: append current timestamp and permit request
   */
  public checkLimit(
    ruleKey: string,
    identifier: string,
    customOverride?: { maxRequests?: number; windowMs?: number; now?: number }
  ): RateLimitResult {
    const rule = this.rules.get(ruleKey);
    const maxRequests = customOverride?.maxRequests ?? rule?.maxRequests ?? 5;
    const windowMs = customOverride?.windowMs ?? rule?.windowMs ?? 60000;
    const now = customOverride?.now ?? Date.now();

    const compositeKey = `${ruleKey}:${identifier.toLowerCase().trim()}`;
    const windowStart = now - windowMs;

    // Retrieve and prune outdated timestamps
    const existingTimestamps = this.timestampLogs.get(compositeKey) || [];
    const activeTimestamps = existingTimestamps.filter(ts => ts > windowStart);

    if (activeTimestamps.length >= maxRequests) {
      // Limit exceeded: Calculate time until the oldest request falls outside the sliding window
      const oldestTimestamp = activeTimestamps[0];
      const expiryMs = oldestTimestamp + windowMs;
      const retryAfterMs = Math.max(0, expiryMs - now);
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

      // Keep pruned timestamps in memory
      this.timestampLogs.set(compositeKey, activeTimestamps);

      return {
        allowed: false,
        currentRequests: activeTimestamps.length,
        maxRequests,
        windowSeconds: Math.round(windowMs / 1000),
        remaining: 0,
        retryAfterSeconds,
        resetAt: expiryMs,
        ruleKey,
      };
    }

    // Request is permitted: Record timestamp into sliding window
    activeTimestamps.push(now);
    this.timestampLogs.set(compositeKey, activeTimestamps);

    const remaining = maxRequests - activeTimestamps.length;
    const oldestTimestamp = activeTimestamps[0];
    const resetAt = oldestTimestamp + windowMs;

    return {
      allowed: true,
      currentRequests: activeTimestamps.length,
      maxRequests,
      windowSeconds: Math.round(windowMs / 1000),
      remaining,
      retryAfterSeconds: 0,
      resetAt,
      ruleKey,
    };
  }

  /**
   * Dual-tier check for authentication (Login):
   * Validates both IP-level rate limit and target-account rate limit.
   */
  public checkLogin(
    ip: string,
    email: string,
    override?: { ipMax?: number; accountMax?: number; windowMs?: number; now?: number }
  ): RateLimitResult {
    // 1. Check IP sliding window
    const ipResult = this.checkLimit('auth_login_ip', ip, {
      maxRequests: override?.ipMax,
      windowMs: override?.windowMs,
      now: override?.now,
    });
    if (!ipResult.allowed) {
      return ipResult;
    }

    // 2. Check targeted email sliding window
    const accountResult = this.checkLimit('auth_login_account', email, {
      maxRequests: override?.accountMax,
      windowMs: override?.windowMs,
      now: override?.now,
    });
    if (!accountResult.allowed) {
      return accountResult;
    }

    return accountResult;
  }

  /**
   * Dual-tier check for Signup:
   * Prevents automated mass user registration and account enumeration testing.
   */
  public checkSignup(
    ip: string,
    email: string,
    override?: { ipMax?: number; emailMax?: number; windowMs?: number; now?: number }
  ): RateLimitResult {
    // 1. Check IP sliding window
    const ipResult = this.checkLimit('auth_signup_ip', ip, {
      maxRequests: override?.ipMax,
      windowMs: override?.windowMs,
      now: override?.now,
    });
    if (!ipResult.allowed) {
      return ipResult;
    }

    // 2. Check targeted email sliding window
    const emailResult = this.checkLimit('auth_signup_email', email, {
      maxRequests: override?.emailMax,
      windowMs: override?.windowMs,
      now: override?.now,
    });
    if (!emailResult.allowed) {
      return emailResult;
    }

    return emailResult;
  }

  /**
   * Dual-tier check for Password Recovery Request:
   * Mitigates email enumeration scans across arbitrary wordlists.
   */
  public checkPasswordRecovery(
    ip: string,
    email: string,
    override?: { ipMax?: number; emailMax?: number; windowMs?: number; now?: number }
  ): RateLimitResult {
    // 1. Check IP sliding window
    const ipResult = this.checkLimit('auth_pwd_recovery_ip', ip, {
      maxRequests: override?.ipMax,
      windowMs: override?.windowMs,
      now: override?.now,
    });
    if (!ipResult.allowed) {
      return ipResult;
    }

    // 2. Check targeted email sliding window
    const emailResult = this.checkLimit('auth_pwd_recovery_email', email, {
      maxRequests: override?.emailMax,
      windowMs: override?.windowMs,
      now: override?.now,
    });
    if (!emailResult.allowed) {
      return emailResult;
    }

    return emailResult;
  }

  /**
   * Single-tier check for Password Reset Token Submission:
   * Prevents brute-forcing short-lived cryptographic tokens.
   */
  public checkPasswordReset(
    ip: string,
    override?: { ipMax?: number; windowMs?: number; now?: number }
  ): RateLimitResult {
    return this.checkLimit('auth_pwd_reset_ip', ip, {
      maxRequests: override?.ipMax,
      windowMs: override?.windowMs,
      now: override?.now,
    });
  }

  /**
   * Clear rate limit timestamps for a specific identifier or rule
   */
  public reset(ruleKey?: string, identifier?: string): void {
    if (ruleKey && identifier) {
      const compositeKey = `${ruleKey}:${identifier.toLowerCase().trim()}`;
      this.timestampLogs.delete(compositeKey);
    } else if (identifier) {
      const lowerId = identifier.toLowerCase().trim();
      for (const key of this.timestampLogs.keys()) {
        if (key.endsWith(`:${lowerId}`)) {
          this.timestampLogs.delete(key);
        }
      }
    } else if (ruleKey) {
      for (const key of this.timestampLogs.keys()) {
        if (key.startsWith(`${ruleKey}:`)) {
          this.timestampLogs.delete(key);
        }
      }
    } else {
      this.timestampLogs.clear();
    }
  }

  /**
   * Reset all rate limiter logs (used for test isolation)
   */
  public resetAll(): void {
    this.timestampLogs.clear();
  }

  /**
   * Get telemetry stats on tracked sliding windows
   */
  public getStats(): { totalTrackedKeys: number; activeTimestampsCount: number } {
    let totalTimestamps = 0;
    this.timestampLogs.forEach(logs => {
      totalTimestamps += logs.length;
    });
    return {
      totalTrackedKeys: this.timestampLogs.size,
      activeTimestampsCount: totalTimestamps,
    };
  }
}

// Global Singleton Instance
export const rateLimiter = new SlidingWindowRateLimiter();
