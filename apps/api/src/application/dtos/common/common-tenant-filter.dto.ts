import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommonDateFilterDto } from './common-date-filter.dto';

export class CommonTenantFilterDto extends CommonDateFilterDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  tenantIds: string[];
}
