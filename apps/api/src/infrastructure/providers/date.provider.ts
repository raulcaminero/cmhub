import { Injectable } from '@nestjs/common';

export const DATE_PROVIDER = 'DATE_PROVIDER';

export interface IDateProvider {
  now(): Date;
  today(): string;
}

@Injectable()
export class DateProvider implements IDateProvider {
  now(): Date {
    return new Date();
  }

  today(): string {
    return this.now().toISOString().split('T')[0];
  }
}
