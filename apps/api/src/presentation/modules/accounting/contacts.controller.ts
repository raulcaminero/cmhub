import { Controller, Get, Post, Delete, Put, Body, Param, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ContactService } from '@application/services/contact/contact.service';
import { CreateContactDto } from '@application/dtos/contact/create-contact.dto';
import { UpdateContactDto } from '@application/dtos/contact/update-contact.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('companies/:companyId/accounting/contacts')
export class ContactsController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000) // 5 minutes cache in ms
  @ApiOperation({ summary: 'List all company contacts' })
  getContacts(@Param('companyId') companyId: string) {
    return this.contactService.getContacts(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new contact (Client or Provider)' })
  createContact(@Param('companyId') companyId: string, @Body() dto: CreateContactDto) {
    return this.contactService.createContact(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact' })
  updateContact(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.updateContact(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact' })
  deleteContact(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.contactService.deleteContact(companyId, id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import contacts via JSON array' })
  importContacts(
    @Param('companyId') companyId: string,
    @Body() dtos: CreateContactDto[],
  ) {
    return this.contactService.importContacts(companyId, dtos);
  }
}
