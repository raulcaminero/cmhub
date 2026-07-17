import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportCsvDto {
  @ApiProperty({ description: 'Bank account ID', example: 'cuid-123' })
  @IsString()
  @IsNotEmpty({ message: 'El accountId no puede estar vacío.' })
  accountId: string;

  @ApiProperty({ description: 'CSV string content' })
  @IsString()
  @IsNotEmpty({ message: 'El csvContent no puede estar vacío.' })
  csvContent: string;
}

export class AutoMatchDto {
  @ApiProperty({ description: 'Bank account ID', example: 'cuid-123' })
  @IsString()
  @IsNotEmpty({ message: 'El accountId no puede estar vacío.' })
  accountId: string;
}

export class ReconcileManuallyDto {
  @ApiProperty({ description: 'Bank transaction ID', example: 'cuid-123' })
  @IsString()
  @IsNotEmpty({ message: 'El bankTransactionId no puede estar vacío.' })
  bankTransactionId: string;

  @ApiProperty({ description: 'Journal entry line ID', example: 'cuid-456' })
  @IsString()
  @IsNotEmpty({ message: 'El journalEntryLineId no puede estar vacío.' })
  journalEntryLineId: string;
}
