import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CollectInvoiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankAccountId: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;
}
