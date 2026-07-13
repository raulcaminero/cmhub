import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  providerRnc: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  providerName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ncf: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  expenseType: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  itbis?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  itbisRetained?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  isrRetained?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
