import { IsEnum, IsOptional, Matches, ValidateIf, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeRangePreset } from '../../enums/time-range-preset.enum';

export class CommonDateFilterDto {
  @ApiPropertyOptional({ enum: TimeRangePreset })
  @IsOptional()
  @IsEnum(TimeRangePreset)
  timeRange?: TimeRangePreset;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @ValidateIf((o) => o.timeRange === TimeRangePreset.CUSTOM)
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @ValidateIf((o) => o.timeRange === TimeRangePreset.CUSTOM)
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;
}
