interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export function rateLimit(config: RateLimitConfig) {
  const store: RateLimitStore = {};

  const cleanup = () => {
    const now = Date.now();
    for (const key in store) {
      if (store[key].resetTime <= now) {
        delete store[key];
      }
    }
  };

  // Run cleanup every minute
  setInterval(cleanup, 60000);

  return {
    tryRequest(key: string): boolean {
      const now = Date.now();
      
      // Clean up expired entries
      if (!store[key] || store[key].resetTime <= now) {
        store[key] = {
          count: 0,
          resetTime: now + config.windowMs
        };
      }

      // Check if limit is exceeded
      if (store[key].count >= config.max) {
        return false;
      }

      // Increment counter
      store[key].count++;
      return true;
    }
  };
}