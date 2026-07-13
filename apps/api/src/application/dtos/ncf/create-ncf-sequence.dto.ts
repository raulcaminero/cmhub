import { IsString, IsNotEmpty, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NcfType } from '@domain/enums';

export class CreateNcfSequenceDto {
  @ApiProperty({ enum: NcfType })
  @IsEnum(NcfType)
  type: NcfType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prefix: string;

  @ApiProperty()
  @IsNumber()
  max: number;

  @ApiProperty()
  @IsDateString()
  expiresAt: string;
}
