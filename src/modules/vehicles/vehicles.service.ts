import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MaintenanceStatus, VehicleStatus } from '../../common/enums';
import { Maintenance } from '../maintenances/entities/maintenance.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Maintenance) private readonly maintenances: Repository<Maintenance>,
  ) {}

  async create(dto: CreateVehicleDto) {
    await this.assertPlateFree(dto.plate);
    return this.vehicles.save(this.vehicles.create(dto));
  }

  findAll(status?: VehicleStatus) {
    return this.vehicles.find({
      where: status ? { status } : {},
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException(`El vehículo con id ${id} no existe`);
    return vehicle;
  }

  async findByPlate(plate: string) {
    const normalized = plate.trim().toUpperCase();
    const vehicle = await this.vehicles.findOne({ where: { plate: normalized } });
    if (!vehicle) throw new NotFoundException(`El vehículo con placa ${normalized} no existe`);
    return vehicle;
  }

  async update(id: number, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);

    if (dto.plate && dto.plate !== vehicle.plate) await this.assertPlateFree(dto.plate);

    if (dto.status === VehicleStatus.INACTIVE) await this.assertNoActiveMaintenance(vehicle);
    if (dto.status && vehicle.status === VehicleStatus.IN_MAINTENANCE && dto.status !== vehicle.status) {
      throw new ConflictException(
        'El estado de un vehículo en mantenimiento solo cambia al completar o cancelar el mantenimiento',
      );
    }
    // Un kilometraje menor al actual sería un retroceso del odómetro.
    if (dto.mileage !== undefined && dto.mileage < vehicle.mileage) {
      throw new BadRequestException(
        `El kilometraje (${dto.mileage}) no puede ser menor al actual (${vehicle.mileage})`,
      );
    }

    return this.vehicles.save(Object.assign(vehicle, dto));
  }

  /** Eliminación lógica: el vehículo queda INACTIVE y se conserva su historial. */
  async remove(id: number) {
    const vehicle = await this.findOne(id);
    await this.assertNoActiveMaintenance(vehicle);
    vehicle.status = VehicleStatus.INACTIVE;
    return this.vehicles.save(vehicle);
  }

  private async assertPlateFree(plate: string) {
    if (await this.vehicles.exists({ where: { plate } })) {
      throw new ConflictException(`Ya existe un vehículo con la placa ${plate}`);
    }
  }

  private async assertNoActiveMaintenance(vehicle: Vehicle) {
    const active = await this.maintenances.count({
      where: {
        vehicleId: vehicle.id,
        status: In([MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]),
      },
    });
    if (active > 0) {
      throw new ConflictException(
        `El vehículo ${vehicle.plate} tiene mantenimientos activos y no puede inactivarse`,
      );
    }
  }
}
