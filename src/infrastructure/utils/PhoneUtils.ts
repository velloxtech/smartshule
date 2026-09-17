export class PhoneUtils {
  /**
   * Cleans a phone string to only its numeric digits
   */
  public static cleanDigits(phone: string): string {
    return (phone || '').replace(/\D/g, '');
  }

  /**
   * Extracts the trailing 9 subscriber digits (e.g. 712345678 or 112345678)
   * This represents the unique local phone number in Kenya regardless of prefix (+254, 254, 0)
   */
  public static getSubscriberDigits(phone: string): string {
    const digits = this.cleanDigits(phone);
    return digits.length >= 9 ? digits.slice(-9) : digits;
  }

  /**
   * Converts any Kenyan phone format to international E.164 (+254...)
   */
  public static toInternational(phone: string): string {
    const cleaned = this.cleanDigits(phone);
    if (!cleaned) return phone;

    const subscriber = this.getSubscriberDigits(phone);
    if (subscriber.length === 9) {
      return `+254${subscriber}`;
    }

    return phone.startsWith('+') ? phone : `+${cleaned}`;
  }

  /**
   * Checks if two phone numbers represent the same person / phone line
   */
  public static areMatches(phoneA?: string | null, phoneB?: string | null): boolean {
    if (!phoneA || !phoneB) return false;

    // Direct string match after trim
    const strA = phoneA.trim();
    const strB = phoneB.trim();
    if (strA.toLowerCase() === strB.toLowerCase()) return true;

    // Subscriber 9-digit match
    const subA = this.getSubscriberDigits(phoneA);
    const subB = this.getSubscriberDigits(phoneB);
    if (subA.length >= 7 && subB.length >= 7 && subA === subB) {
      return true;
    }

    // Direct cleaned digits match
    const digitsA = this.cleanDigits(phoneA);
    const digitsB = this.cleanDigits(phoneB);
    return digitsA === digitsB;
  }

  /**
   * Returns standard variations of a phone number for broad matching
   */
  public static getMatchVariants(phone: string): string[] {
    const sub = this.getSubscriberDigits(phone);
    const digits = this.cleanDigits(phone);
    const variants = new Set<string>();

    if (sub.length === 9) {
      variants.add(`+254${sub}`);
      variants.add(`254${sub}`);
      variants.add(`0${sub}`);
      variants.add(sub);
    }

    if (digits) {
      variants.add(digits);
      variants.add(`+${digits}`);
    }

    if (phone.trim()) {
      variants.add(phone.trim());
    }

    return Array.from(variants);
  }
}
