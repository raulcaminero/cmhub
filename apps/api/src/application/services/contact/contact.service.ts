import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { IContactRepository } from '@domain/repositories/contact.repository.interface';
import { CreateContactDto } from '../../dtos/contact/create-contact.dto';
import { ContactType, ContactEntity } from '@domain/entities/contact.entity';

export const CONTACT_REPOSITORY = 'CONTACT_REPOSITORY';

@Injectable()
export class ContactService {
  constructor(
    @Inject(CONTACT_REPOSITORY) private readonly contactRepository: IContactRepository,
  ) {}

  async getContacts(companyId: string) {
    return this.contactRepository.findByCompany(companyId);
  }

  async createContact(companyId: string, dto: CreateContactDto) {
    const existing = await this.contactRepository.findByRnc(companyId, dto.rnc);
    if (existing) {
      throw new BadRequestException(`Un contacto con el RNC ${dto.rnc} ya existe en esta empresa.`);
    }

    return this.contactRepository.create({
      companyId,
      rnc: dto.rnc,
      name: dto.name,
      type: dto.type,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    });
  }

  async deleteContact(companyId: string, id: string) {
    const existing = await this.contactRepository.findById(id, companyId);
    if (!existing) {
      throw new BadRequestException('Contacto no encontrado.');
    }
    return this.contactRepository.delete(id, companyId);
  }

  async findOrCreateContact(
    companyId: string,
    rnc: string,
    name: string,
    type: ContactType,
  ): Promise<ContactEntity> {
    const existing = await this.contactRepository.findByRnc(companyId, rnc);
    if (existing) {
      // If contact exists but the role type doesn't cover the new transaction, upgrade to BOTH
      if (existing.type !== ContactType.BOTH && existing.type !== type) {
        return this.contactRepository.update(existing.id, companyId, {
          type: ContactType.BOTH,
        });
      }
      return existing;
    }

    // Create a new contact automatically
    return this.contactRepository.create({
      companyId,
      rnc,
      name,
      type,
      email: null,
      phone: null,
      address: null,
    });
  }
}
