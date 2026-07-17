import type { Contact as PrismaContact } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IContactRepository } from '@domain/repositories/contact.repository.interface';
import { ContactEntity, ContactType } from '@domain/entities/contact.entity';

const mapContact = (contact: PrismaContact): ContactEntity => ({
  id: contact.id,
  companyId: contact.companyId,
  rnc: contact.rnc,
  name: contact.name,
  type: contact.type as ContactType,
  email: contact.email,
  phone: contact.phone,
  address: contact.address,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
});

@Injectable()
export class ContactRepository implements IContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, companyId: string): Promise<ContactEntity | null> {
    const contact = await this.prisma.contact.findFirst({ where: { id, companyId } });
    return contact ? mapContact(contact) : null;
  }

  async findByRnc(companyId: string, rnc: string): Promise<ContactEntity | null> {
    const contact = await this.prisma.contact.findUnique({
      where: { companyId_rnc: { companyId, rnc } },
    });
    return contact ? mapContact(contact) : null;
  }

  async findByCompany(companyId: string): Promise<ContactEntity[]> {
    const contacts = await this.prisma.contact.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
    return contacts.map(mapContact);
  }

  async create(data: Omit<ContactEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContactEntity> {
    const contact = await this.prisma.contact.create({
      data: {
        companyId: data.companyId,
        rnc: data.rnc,
        name: data.name,
        type: data.type,
        email: data.email,
        phone: data.phone,
        address: data.address,
      },
    });
    return mapContact(contact);
  }

  async update(
    id: string,
    companyId: string,
    data: Partial<Omit<ContactEntity, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ContactEntity> {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Contacto no encontrado o acceso denegado.');
    }
    const contact = await this.prisma.contact.update({
      where: { id },
      data,
    });
    return mapContact(contact);
  }

  async delete(id: string, companyId: string): Promise<ContactEntity> {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Contacto no encontrado o acceso denegado.');
    }
    const contact = await this.prisma.contact.delete({
      where: { id },
    });
    return mapContact(contact);
  }
}
