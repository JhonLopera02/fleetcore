import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActiveStatus, Role } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { CreateMechanicDto } from './dto/create-mechanic.dto';
import { UpdateMechanicDto } from './dto/update-mechanic.dto';
import { Mechanic } from './entities/mechanic.entity';

@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(Mechanic) private readonly mechanics: Repository<Mechanic>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async create(dto: CreateMechanicDto) {
    await this.assertEmailFree(dto.email);
    if (dto.userId) await this.assertUserLinkable(dto.userId);
    return this.mechanics.save(this.mechanics.create(dto));
  }

  findAll() {
    return this.mechanics.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const mechanic = await this.mechanics.findOne({ where: { id } });
    if (!mechanic) throw new NotFoundException(`El mecánico con id ${id} no existe`);
    return mechanic;
  }

  async update(id: number, dto: UpdateMechanicDto) {
    const mechanic = await this.findOne(id);
    if (dto.email && dto.email !== mechanic.email) await this.assertEmailFree(dto.email);
    if (dto.userId && dto.userId !== mechanic.userId) {
      await this.assertUserLinkable(dto.userId, id);
    }
    return this.mechanics.save(Object.assign(mechanic, dto));
  }

  /** Activar/inactivar. Inactivar NO borra nada: el historial se conserva. */
  async setStatus(id: number, status: ActiveStatus) {
    const mechanic = await this.findOne(id);
    mechanic.status = status;
    return this.mechanics.save(mechanic);
  }

  private async assertEmailFree(email: string) {
    if (await this.mechanics.exists({ where: { email } })) {
      throw new ConflictException(`Ya existe un mecánico con el correo ${email}`);
    }
  }

  private async assertUserLinkable(userId: number, mechanicId?: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`El usuario con id ${userId} no existe`);
    if (user.role !== Role.TECHNICIAN) {
      throw new BadRequestException('Solo se puede vincular un usuario con rol TECHNICIAN');
    }
    const taken = await this.mechanics.findOne({ where: { userId } });
    if (taken && taken.id !== mechanicId) {
      throw new ConflictException(`El usuario ${userId} ya está vinculado a otro mecánico`);
    }
  }
}
