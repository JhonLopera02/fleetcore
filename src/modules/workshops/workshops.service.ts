import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActiveStatus } from '../../common/enums';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { Workshop } from './entities/workshop.entity';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop) private readonly workshops: Repository<Workshop>,
  ) {}

  create(dto: CreateWorkshopDto) {
    return this.workshops.save(this.workshops.create(dto));
  }

  /** Solo talleres activos (los únicos asignables a un mantenimiento). */
  findActive() {
    return this.workshops.find({ where: { status: ActiveStatus.ACTIVE }, order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const workshop = await this.workshops.findOne({ where: { id } });
    if (!workshop) throw new NotFoundException(`El taller con id ${id} no existe`);
    return workshop;
  }

  async update(id: number, dto: UpdateWorkshopDto) {
    const workshop = await this.findOne(id);
    return this.workshops.save(Object.assign(workshop, dto));
  }

  async setStatus(id: number, status: ActiveStatus) {
    const workshop = await this.findOne(id);
    workshop.status = status;
    return this.workshops.save(workshop);
  }
}
