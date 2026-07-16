import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { UserEntity } from '@domain/entities/user.entity';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserEntity> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Partial<Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UserEntity> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
