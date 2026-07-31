import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NcfType } from '@domain/enums';

export class CreateInvoiceLineDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  cost?: number;
}

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

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  itbis?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bankAccountId?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  costOfGoodsSold?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  itbisRetained?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  isrRetained?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  quotationId?: string;

  @ApiProperty({ type: [CreateInvoiceLineDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines?: CreateInvoiceLineDto[];
}
