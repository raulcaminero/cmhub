import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, IsEmail, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxRegime } from '@domain/enums';

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'RNC (9 digits) or Cédula (11 digits)', example: '101234567' })
  @IsString()
  @Matches(/^(\d{9}|\d{11})$/, { message: 'RNC must be 9 digits or Cédula must be 11 digits' })
  rnc: string;

  @ApiPropertyOptional({ enum: TaxRegime, default: TaxRegime.ORDINARIO })
  @IsOptional()
  @IsEnum(TaxRegime)
  taxRegime?: TaxRegime;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tradeName?: string;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 country code', example: 'DO', default: 'DO' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code', example: 'DOP', default: 'DOP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ description: 'BCP 47 locale tag', example: 'es-DO', default: 'es-DO' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'List of enabled system modules', example: ['DR_FISCAL'] })
  @IsOptional()
  @IsString({ each: true })
  enabledModules?: string[];

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
