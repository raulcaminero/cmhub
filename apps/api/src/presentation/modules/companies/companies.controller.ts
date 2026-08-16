import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { CompanyService } from '@application/services/company/company.service';
import { CreateCompanyDto } from '@application/dtos/company/create-company.dto';
import { UpdateCompanyDto } from '@application/dtos/company/update-company.dto';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

import { Delete } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

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

  @Put(':id')
  @ApiOperation({ summary: 'Update company details' })
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() user: CurrentUserPayload) {
    return this.companyService.update(id, dto, user.userId);
  }

  // --- TEAM MANAGEMENT ---

  @Get(':companyId/users')
  @ApiOperation({ summary: 'List company team members' })
  getCompanyUsers(@Param('companyId') companyId: string) {
    return this.companyService.getCompanyUsers(companyId);
  }

  @Roles(UserRole.ADMIN)
  @Post(':companyId/users')
  @ApiOperation({ summary: 'Add a new member to the company team' })
  addCompanyUser(
    @Param('companyId') companyId: string,
    @Body('email') email: string,
    @Body('role') role: UserRole,
  ) {
    return this.companyService.addCompanyUser(companyId, email, role);
  }

  @Roles(UserRole.ADMIN)
  @Put(':companyId/users/:userId/role')
  @ApiOperation({ summary: 'Update a team member role' })
  updateUserRole(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: UserRole,
  ) {
    return this.companyService.updateUserRole(companyId, targetUserId, role);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':companyId/users/:userId')
  @ApiOperation({ summary: 'Remove a user from the company' })
  removeCompanyUser(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.companyService.removeCompanyUser(companyId, targetUserId, user.userId);
  }
}
