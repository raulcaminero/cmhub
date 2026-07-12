export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  static of(amount: number, currency = 'DOP'): Money {
    if (amount < 0) throw new Error('Amount cannot be negative');
    return new Money(Math.round(amount * 100) / 100, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
    return Money.of(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
    return Money.of(this.amount - other.amount, this.currency);
  }

  toNumber(): number {
    return this.amount;
  }
}
