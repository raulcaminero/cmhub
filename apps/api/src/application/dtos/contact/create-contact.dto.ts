import { IsString, IsNotEmpty, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactType } from '@domain/entities/contact.entity';

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  rnc: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ContactType })
  @IsEnum(ContactType)
  type: ContactType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;
}
