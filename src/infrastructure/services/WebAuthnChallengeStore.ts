interface StoredChallenge {
  challenge: string;
  userId?: string;
  userEmail?: string;
  expiresAt: number;
}

export class WebAuthnChallengeStore {
  private challenges: Map<string, StoredChallenge> = new Map();
  private readonly defaultTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Periodic cleanup of expired challenges every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000).unref?.();
  }

  public set(key: string, data: { challenge: string; userId?: string; userEmail?: string; ttlMs?: number }): void {
    const expiresAt = Date.now() + (data.ttlMs || this.defaultTtlMs);
    this.challenges.set(key, {
      challenge: data.challenge,
      userId: data.userId,
      userEmail: data.userEmail,
      expiresAt
    });
  }

  public get(key: string): StoredChallenge | null {
    const entry = this.challenges.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.challenges.delete(key);
      return null;
    }
    return entry;
  }

  public consume(key: string): StoredChallenge | null {
    const entry = this.get(key);
    if (entry) {
      this.challenges.delete(key);
    }
    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.challenges.entries()) {
      if (now > entry.expiresAt) {
        this.challenges.delete(key);
      }
    }
  }
}

export const webAuthnChallengeStore = new WebAuthnChallengeStore();
