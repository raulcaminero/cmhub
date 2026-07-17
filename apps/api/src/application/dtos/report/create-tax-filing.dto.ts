import { IsString, Matches, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxFilingDto {
  @ApiProperty({ description: 'Fiscal period in YYYYMM format', example: '202607' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El período debe tener formato YYYYMM (6 dígitos).' })
  period: string;

  @ApiProperty({ description: 'Tax declaration type', example: 'IT1', enum: ['IT1'] })
  @IsString()
  @IsIn(['IT1'], { message: 'Tipo de impuesto inválido. Solo se soporta IT1.' })
  taxType: string;
}
