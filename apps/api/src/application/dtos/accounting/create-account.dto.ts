import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@domain/enums';

export class CreateAccountDto {
  @ApiProperty({ example: '1.1.01' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)*$/, { message: 'Code must follow pattern like 1, 1.1, 1.1.01' })
  code: string;

  @ApiProperty({ example: 'Caja y Bancos' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;
}
