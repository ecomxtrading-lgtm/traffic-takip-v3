/**
 * Redis Key Naming Convention
 * Centralized key management for multi-tenant Redis cache
 */

export interface RedisKeyConfig {
  prefix: string;
  ttl?: number; // TTL in seconds
  description: string;
}

/**
 * Redis key patterns and configurations
 */
export const REDIS_KEYS = {
  // Presence tracking (real-time user activity)
  PRESENCE: {
    SESSION: {
      pattern: 'presence:{site_id}:{session_id}',
      ttl: 300, // 5 minutes
      description: 'User presence tracking per session',
    },
    USER: {
      pattern: 'presence:{site_id}:user:{user_id}',
      ttl: 300, // 5 minutes
      description: 'User presence tracking per user',
    },
    SITE_ONLINE: {
      pattern: 'presence:{site_id}:online',
      ttl: 60, // 1 minute
      description: 'Online users count per site',
    },
  },

  // Live events (real-time event streaming)
  LIVE: {
    ADD_TO_CART: {
      pattern: 'live:add_to_cart:{site_id}',
      ttl: 3600, // 1 hour
      description: 'Live add to cart events stream',
    },
    PURCHASE: {
      pattern: 'live:purchase:{site_id}',
      ttl: 3600, // 1 hour
      description: 'Live purchase events stream',
    },
    PAGE_VIEW: {
      pattern: 'live:page_view:{site_id}',
      ttl: 1800, // 30 minutes
      description: 'Live page view events stream',
    },
    CUSTOM: {
      pattern: 'live:{event_name}:{site_id}',
      ttl: 1800, // 30 minutes
      description: 'Live custom events stream',
    },
  },

  // Email Marketing Automation (EMA)
  EMA: {
    SITE_CONFIG: {
      pattern: 'ema:{site_id}:config',
      ttl: 3600, // 1 hour
      description: 'Email marketing configuration per site',
    },
    USER_SEGMENTS: {
      pattern: 'ema:{site_id}:segments:{user_id}',
      ttl: 1800, // 30 minutes
      description: 'User segments for email targeting',
    },
    CAMPAIGN_QUEUE: {
      pattern: 'ema:{site_id}:campaign:{campaign_id}:queue',
      ttl: 86400, // 24 hours
      description: 'Email campaign queue per site',
    },
    UNSUBSCRIBE: {
      pattern: 'ema:{site_id}:unsubscribed:{user_id}',
      ttl: 31536000, // 1 year
      description: 'Unsubscribed users per site',
    },
  },

  // Rate limiting
  RATE_LIMIT: {
    IP: {
      pattern: 'rate_limit:ip:{ip_address}',
      ttl: 3600, // 1 hour
      description: 'Rate limiting by IP address',
    },
    SITE_IP: {
      pattern: 'rate_limit:site:{site_id}:ip:{ip_address}',
      ttl: 3600, // 1 hour
      description: 'Rate limiting by site and IP combination',
    },
    API_KEY: {
      pattern: 'rate_limit:api_key:{api_key}',
      ttl: 3600, // 1 hour
      description: 'Rate limiting by API key',
    },
  },

  // Session management
  SESSION: {
    DATA: {
      pattern: 'session:{site_id}:{session_id}',
      ttl: 1800, // 30 minutes
      description: 'Session data storage',
    },
    USER: {
      pattern: 'session:{site_id}:user:{user_id}',
      ttl: 1800, // 30 minutes
      description: 'User session mapping',
    },
  },

  // Caching
  CACHE: {
    SITE_CONFIG: {
      pattern: 'cache:site:{site_id}:config',
      ttl: 3600, // 1 hour
      description: 'Cached site configuration',
    },
    USER_PROFILE: {
      pattern: 'cache:user:{site_id}:{user_id}',
      ttl: 1800, // 30 minutes
      description: 'Cached user profile data',
    },
    ANALYTICS: {
      pattern: 'cache:analytics:{site_id}:{metric_type}:{date_range}',
      ttl: 300, // 5 minutes
      description: 'Cached analytics data',
    },
  },

  // Locks and coordination
  LOCK: {
    SITE_UPDATE: {
      pattern: 'lock:site:{site_id}:update',
      ttl: 30, // 30 seconds
      description: 'Site update operation lock',
    },
    MIGRATION: {
      pattern: 'lock:migration:{migration_name}',
      ttl: 300, // 5 minutes
      description: 'Database migration lock',
    },
  },
} as const;

/**
 * Key builder utility functions
 */
export class RedisKeyBuilder {
  /**
   * Build a Redis key by replacing placeholders
   */
  static build(
    pattern: string,
    replacements: Record<string, string | number>
  ): string {
    let key = pattern;
    for (const [placeholder, value] of Object.entries(replacements)) {
      key = key.replace(`{${placeholder}}`, String(value));
    }
    return key;
  }

  /**
   * Build presence session key
   */
  static presenceSession(siteId: string, sessionId: string): string {
    return this.build(REDIS_KEYS.PRESENCE.SESSION.pattern, {
      site_id: siteId,
      session_id: sessionId,
    });
  }

  /**
   * Build presence user key
   */
  static presenceUser(siteId: string, userId: string): string {
    return this.build(REDIS_KEYS.PRESENCE.USER.pattern, {
      site_id: siteId,
      user_id: userId,
    });
  }

  /**
   * Build live event key
   */
  static liveEvent(siteId: string, eventName: string): string {
    if (eventName === 'add_to_cart') {
      return this.build(REDIS_KEYS.LIVE.ADD_TO_CART.pattern, {
        site_id: siteId,
      });
    }
    if (eventName === 'purchase') {
      return this.build(REDIS_KEYS.LIVE.PURCHASE.pattern, {
        site_id: siteId,
      });
    }
    if (eventName === 'page_view') {
      return this.build(REDIS_KEYS.LIVE.PAGE_VIEW.pattern, {
        site_id: siteId,
      });
    }
    return this.build(REDIS_KEYS.LIVE.CUSTOM.pattern, {
      site_id: siteId,
      event_name: eventName,
    });
  }

  /**
   * Build EMA key
   */
  static ema(siteId: string, type: string, ...args: string[]): string {
    const pattern = `ema:{site_id}:${type}`;
    return this.build(pattern, {
      site_id: siteId,
      ...Object.fromEntries(
        args.map((arg, index) => [`arg${index}`, arg])
      ),
    });
  }

  /**
   * Build rate limit key
   */
  static rateLimit(siteId: string, ipAddress: string): string {
    return this.build(REDIS_KEYS.RATE_LIMIT.SITE_IP.pattern, {
      site_id: siteId,
      ip_address: ipAddress,
    });
  }

  /**
   * Build session key
   */
  static session(siteId: string, sessionId: string): string {
    return this.build(REDIS_KEYS.SESSION.DATA.pattern, {
      site_id: siteId,
      session_id: sessionId,
    });
  }

  /**
   * Build cache key
   */
  static cache(siteId: string, type: string, ...args: string[]): string {
    const pattern = `cache:${type}:{site_id}:${args.map(() => '{}').join(':')}`;
    return this.build(pattern, {
      site_id: siteId,
      ...Object.fromEntries(
        args.map((arg, index) => [`arg${index}`, arg])
      ),
    });
  }
}

/**
 * Get TTL for a key pattern
 */
export function getKeyTTL(keyPattern: string): number | undefined {
  // Find matching pattern and return its TTL
  const patterns = Object.values(REDIS_KEYS).flatMap((category) =>
    Object.values(category)
  );
  
  const pattern = patterns.find((p) => p.pattern === keyPattern);
  return pattern?.ttl;
}

/**
 * Validate Redis key format
 */
export function validateRedisKey(key: string): boolean {
  // Basic validation - should not contain spaces or special characters
  return /^[a-zA-Z0-9:_-]+$/.test(key);
}
