import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePayrollDto {
  @ApiProperty({ description: 'Payroll period in YYYYMM format (e.g., 202607)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Period must be in YYYYMM format' })
  period: string;
}
