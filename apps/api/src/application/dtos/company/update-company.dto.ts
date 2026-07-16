import { IsEnum, IsOptional, IsString, Matches, MaxLength, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaxRegime } from '@domain/enums';

export class UpdateCompanyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'RNC (9 digits) or Cédula (11 digits)', example: '101234567' })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{9}|\d{11})$/, { message: 'RNC must be 9 digits or Cédula must be 11 digits' })
  rnc?: string;

  @ApiPropertyOptional({ enum: TaxRegime, default: TaxRegime.ORDINARIO })
  @IsOptional()
  @IsEnum(TaxRegime)
  taxRegime?: TaxRegime;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}
