/**
 * Immutable money value — mirrors digis_backend's Core::Money.
 *
 * - amountMinor is ALWAYS integer cents (the backend's `*_minor` unit).
 * - Arithmetic refuses to mix currencies (throws CurrencyMismatchError).
 * - toMajor() / format() are the ONLY places cents become display units.
 * - Use fromMinor() for wire data, fromMajor() only for authoring mocks/seed input.
 */

const CURRENCY_RE = /^[A-Z]{3}$/;

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Currency mismatch: ${a} vs ${b}`);
    this.name = 'CurrencyMismatchError';
  }
}

export class Money {
  readonly amountMinor: number;
  readonly currency: string;

  private constructor(amountMinor: number, currency: string) {
    if (!Number.isInteger(amountMinor)) {
      throw new TypeError(`Money amountMinor must be an integer, got ${amountMinor}`);
    }
    if (!CURRENCY_RE.test(currency)) {
      throw new TypeError(`Invalid currency code: ${currency}`);
    }
    this.amountMinor = amountMinor;
    this.currency = currency;
    Object.freeze(this);
  }

  /** Default entry point: from wire format (integer cents + ISO currency). */
  static fromMinor(amountMinor: number, currency: string): Money {
    return new Money(amountMinor, currency);
  }

  /**
   * From major units — ONLY for authoring mocks/seeds/display input.
   * E.g. Money.fromMajor(600, 'ETB') → amountMinor=60000
   */
  static fromMajor(amount: number, currency: string): Money {
    return new Money(Math.round(amount * 100), currency);
  }

  static zero(currency: string): Money {
    return new Money(0, currency);
  }

  assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }

  plus(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinor(this.amountMinor + other.amountMinor, this.currency);
  }

  minus(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinor(this.amountMinor - other.amountMinor, this.currency);
  }

  /** Multiply by an integer quantity — the only allowed multiplier. */
  times(factor: number): Money {
    if (!Number.isInteger(factor)) {
      throw new TypeError(`Money.times factor must be an integer, got ${factor}`);
    }
    return Money.fromMinor(this.amountMinor * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amountMinor === other.amountMinor;
  }

  /** Cents → major units. Only call this at render boundaries. */
  toMajor(): number {
    return this.amountMinor / 100;
  }

  /** Display: "2,500 ETB" / "5.50 USD". Render-only. */
  format(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: this.amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(this.toMajor());
  }

  /**
   * Display the number only, without currency: "2,500" / "5.5".
   * Use when the layout renders the currency label separately (e.g. a small
   * "ETB" span next to a large number).
   */
  formatNumber(): string {
    return this.toMajor().toLocaleString('en-US', {
      minimumFractionDigits: this.amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }
}