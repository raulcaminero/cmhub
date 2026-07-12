import { NcfType } from '../enums';

export class NcfNumber {
  private constructor(
    readonly type: NcfType,
    readonly sequence: number,
  ) {}

  static of(type: NcfType, sequence: number): NcfNumber {
    if (sequence < 1 || sequence > 99999999) throw new Error('Invalid NCF sequence');
    return new NcfNumber(type, sequence);
  }

  toString(): string {
    return `${this.type}${String(this.sequence).padStart(8, '0')}`;
  }
}
