interface IpBlockerConfig {
  maxAttempts: number;
  banDuration: number;
}

interface BlockedIp {
  attempts: number;
  lastAttempt: number;
  bannedUntil: number | null;
}

export class IpBlocker {
  private blockedIps: Map<string, BlockedIp>;
  private config: IpBlockerConfig;

  constructor(config: IpBlockerConfig) {
    this.blockedIps = new Map();
    this.config = config;

    // Cleanup expired bans every hour
    setInterval(() => this.cleanup(), 3600000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.blockedIps.entries()) {
      if (data.bannedUntil && data.bannedUntil <= now) {
        this.blockedIps.delete(ip);
      }
    }
  }

  public recordFailedAttempt(ip: string) {
    const now = Date.now();
    const data = this.blockedIps.get(ip) || {
      attempts: 0,
      lastAttempt: now,
      bannedUntil: null
    };

    data.attempts++;
    data.lastAttempt = now;

    if (data.attempts >= this.config.maxAttempts) {
      data.bannedUntil = now + this.config.banDuration;
    }

    this.blockedIps.set(ip, data);
  }

  public clearFailedAttempts(ip: string) {
    this.blockedIps.delete(ip);
  }

  public isBanned(ip: string): boolean {
    const data = this.blockedIps.get(ip);
    if (!data) return false;

    const now = Date.now();
    if (data.bannedUntil && data.bannedUntil > now) {
      return true;
    }

    if (data.bannedUntil && data.bannedUntil <= now) {
      this.blockedIps.delete(ip);
      return false;
    }

    return false;
  }
}