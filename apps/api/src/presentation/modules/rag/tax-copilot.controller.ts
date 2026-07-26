import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaxCopilotService } from '../../../application/services/rag/tax-copilot.service';
import { RagService } from '../../../application/services/rag/rag.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Tax Copilot')
@ApiBearerAuth()
@Controller('companies/:companyId/tax-copilot')
export class TaxCopilotController {
  constructor(
    private readonly taxCopilotService: TaxCopilotService,
    private readonly ragService: RagService
  ) {}

  @Post('ask')
  @ApiOperation({ summary: 'Ask a tax or financial question to the AI Copilot' })
  async askCopilot(
    @Param('companyId') companyId: string,
    @Body() body: { question: string },
    @CurrentUser() user: CurrentUserPayload
  ) {
    const reply = await this.taxCopilotService.askCopilot(companyId, body.question, user.userId);
    return { reply };
  }

  @Post('admin/ingest')
  @ApiOperation({ summary: 'Admin tool to ingest DGII tax laws and regulations' })
  async ingestDocument(
    @Body() body: { title: string; rawText: string }
  ) {
    await this.ragService.ingestDocument(body.title, body.rawText);
    return { status: 'success', message: `Documento "${body.title}" indexado.` };
  }
}
