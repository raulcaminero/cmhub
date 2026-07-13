import { IsString, IsNotEmpty, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NcfType } from '@domain/enums';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientRnc: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @ApiProperty({ enum: NcfType })
  @IsEnum(NcfType)
  ncfType: NcfType;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsNumber()
  itbis: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
