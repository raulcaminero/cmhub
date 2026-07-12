import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CompanyService } from '@application/services/company/company.service';
import { CreateCompanyDto } from '@application/dtos/company/create-company.dto';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company' })
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: CurrentUserPayload) {
    return this.companyService.create(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all companies for the current user' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.companyService.findAllForUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company details' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.companyService.findOneForUser(id, user.userId);
  }
}
