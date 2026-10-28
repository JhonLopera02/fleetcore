import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  ActiveStatus,
  MaintenanceStatus,
  Role,
  VehicleStatus,
} from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Mechanic } from '../mechanics/entities/mechanic.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { FilterMaintenancesDto } from './dto/filter-maintenances.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { MaintenanceStatusLog } from './entities/maintenance-status-log.entity';
import { Maintenance } from './entities/maintenance.entity';
import { ACTIVE_STATUSES, assertValidTransition } from './maintenance-state';

const RELATIONS = { vehicle: true, mechanic: true, workshop: true } as const;

@Injectable()
export class MaintenancesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Maintenance) private readonly maintenances: Repository<Maintenance>,
    @InjectRepository(MaintenanceStatusLog) private readonly logs: Repository<MaintenanceStatusLog>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Mechanic) private readonly mechanics: Repository<Mechanic>,
  ) {}

  // ------------------------------------------------------------------ crear
  /**
   * Crea un mantenimiento aplicando TODAS las reglas de negocio dentro de una
   * transacción. Se bloquean (SELECT ... FOR UPDATE) las filas del vehículo y
   * del mecánico para que dos peticiones simultáneas no puedan saltarse las
   * validaciones de "un solo mantenimiento activo" / "sin cruces de horario".
   */
  async create(dto: CreateMaintenanceDto, user: JwtPayload) {
    const scheduledAt = new Date(dto.scheduledAt);
    const minutes = dto.estimatedMinutes ?? 60;
    const endsAt = new Date(scheduledAt.getTime() + minutes * 60_000);

    const id = await this.dataSource.transaction(async (manager) => {
      const vehicle = await manager.findOne(Vehicle, {
        where: { id: dto.vehicleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehicle) throw new NotFoundException(`El vehículo con id ${dto.vehicleId} no existe`);
      if (vehicle.status === VehicleStatus.INACTIVE) {
        throw new ConflictException(
          `El vehículo ${vehicle.plate} está INACTIVE y no admite nuevos mantenimientos`,
        );
      }

      const mechanic = await manager.findOne(Mechanic, {
        where: { id: dto.mechanicId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!mechanic) throw new NotFoundException(`El mecánico con id ${dto.mechanicId} no existe`);
      if (mechanic.status === ActiveStatus.INACTIVE) {
        throw new ConflictException(`El mecánico ${mechanic.name} está inactivo`);
      }

      const workshop = await manager.findOne(Workshop, { where: { id: dto.workshopId } });
      if (!workshop) throw new NotFoundException(`El taller con id ${dto.workshopId} no existe`);
      if (workshop.status === ActiveStatus.INACTIVE) {
        throw new ConflictException(`El taller ${workshop.name} está inactivo`);
      }

      if (dto.mileage < vehicle.mileage) {
        throw new BadRequestException(
          `El kilometraje del mantenimiento (${dto.mileage}) no puede ser inferior al actual del vehículo (${vehicle.mileage})`,
        );
      }

      // Un vehículo no puede tener más de un mantenimiento activo.
      const vehicleBusy = await manager.count(Maintenance, {
        where: { vehicleId: vehicle.id, status: In(ACTIVE_STATUSES) },
      });
      if (vehicleBusy > 0) {
        throw new ConflictException(`El vehículo ${vehicle.plate} ya tiene un mantenimiento activo`);
      }

      // Un mecánico no puede tener horarios cruzados (en cualquier taller).
      // Dos intervalos [a,b) y [c,d) se cruzan si a < d y b > c.
      // Con intervalos semiabiertos, terminar a las 9:00 y empezar a las 9:00 NO es cruce.
      const overlapping = await manager
        .createQueryBuilder(Maintenance, 'm')
        .where('m.mechanicId = :mechanicId', { mechanicId: mechanic.id })
        .andWhere('m.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
        .andWhere('m.scheduledAt < :endsAt', { endsAt })
        .andWhere('m.endsAt > :scheduledAt', { scheduledAt })
        .getCount();
      if (overlapping > 0) {
        throw new ConflictException(
          `El mecánico ${mechanic.name} ya tiene un mantenimiento activo que se cruza con ese horario`,
        );
      }

      const maintenance = await manager.save(
        manager.create(Maintenance, {
          type: dto.type,
          description: dto.description,
          mileage: dto.mileage,
          scheduledAt,
          estimatedMinutes: minutes,
          endsAt,
          status: MaintenanceStatus.SCHEDULED, // estado inicial obligatorio
          vehicleId: vehicle.id,
          mechanicId: mechanic.id,
          workshopId: workshop.id,
        }),
      );
      await this.audit(manager, maintenance.id, null, MaintenanceStatus.SCHEDULED, user.sub);
      return maintenance.id;
    });

    return this.findDetailed(id);
  }

  // ------------------------------------------------------- cambiar de estado
  /**
   * Cambia el estado aplicando la máquina de estados y sincroniza el vehículo
   * (IN_PROGRESS => IN_MAINTENANCE, COMPLETED/CANCELLED => AVAILABLE).
   * Todo ocurre en una transacción: o se guarda todo o no se guarda nada.
   */
  async updateStatus(id: number, dto: UpdateMaintenanceStatusDto, user: JwtPayload) {
    await this.dataSource.transaction(async (manager) => {
      const maintenance = await manager.findOne(Maintenance, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!maintenance) throw new NotFoundException(`El mantenimiento con id ${id} no existe`);

      await this.assertCanAccess(user, maintenance);

      const vehicle = await manager.findOneOrFail(Vehicle, {
        where: { id: maintenance.vehicleId },
        lock: { mode: 'pessimistic_write' },
      });

      const from = maintenance.status;
      const to = dto.status;
      assertValidTransition(from, to);

      if (to === MaintenanceStatus.IN_PROGRESS) {
        if (vehicle.status === VehicleStatus.INACTIVE) {
          throw new ConflictException(`El vehículo ${vehicle.plate} está INACTIVE`);
        }
        const mechanicBusy = await manager.count(Maintenance, {
          where: { mechanicId: maintenance.mechanicId, status: MaintenanceStatus.IN_PROGRESS },
        });
        if (mechanicBusy > 0) {
          throw new ConflictException('El mecánico ya tiene un mantenimiento en proceso');
        }
        vehicle.status = VehicleStatus.IN_MAINTENANCE;
      }

      if (to === MaintenanceStatus.COMPLETED) {
        this.applyClosure(maintenance, vehicle, dto);
        vehicle.status = VehicleStatus.AVAILABLE;
      }

      if (to === MaintenanceStatus.CANCELLED && from === MaintenanceStatus.IN_PROGRESS) {
        vehicle.status = VehicleStatus.AVAILABLE; // el vehículo se libera
      }

      maintenance.status = to;
      await manager.save(vehicle);
      await manager.save(maintenance);
      await this.audit(manager, maintenance.id, from, to, user.sub);
    });

    return this.findDetailed(id);
  }

  /** Valida y aplica los datos obligatorios de cierre. */
  private applyClosure(maintenance: Maintenance, vehicle: Vehicle, dto: UpdateMaintenanceStatusDto) {
    const missing: string[] = [];
    if (!dto.workDone) missing.push('workDone (trabajo realizado)');
    if (dto.finalCost === undefined) missing.push('finalCost (costo final)');
    if (!dto.finishedAt) missing.push('finishedAt (fecha de finalización)');
    if (dto.finalMileage === undefined) missing.push('finalMileage (kilometraje final)');
    if (missing.length) {
      throw new BadRequestException(
        `No se puede completar el mantenimiento. Faltan: ${missing.join(', ')}`,
      );
    }
    if (dto.finalMileage! < vehicle.mileage) {
      throw new BadRequestException(
        `El kilometraje final (${dto.finalMileage}) no puede ser inferior al actual del vehículo (${vehicle.mileage})`,
      );
    }
    const finishedAt = new Date(dto.finishedAt!);
    if (finishedAt < maintenance.scheduledAt) {
      throw new BadRequestException('La fecha de finalización no puede ser anterior a la fecha programada');
    }

    maintenance.workDone = dto.workDone!;
    maintenance.finalCost = dto.finalCost!;
    maintenance.finishedAt = finishedAt;
    maintenance.finalMileage = dto.finalMileage!;
    vehicle.mileage = dto.finalMileage!; // el odómetro del vehículo se actualiza
  }

  // -------------------------------------------------------------- consultas
  findAll(filter: FilterMaintenancesDto) {
    return this.maintenances.find({
      where: { ...(filter.status && { status: filter.status }), ...(filter.type && { type: filter.type }) },
      relations: RELATIONS,
      order: { scheduledAt: 'DESC' },
    });
  }

  findActive() {
    return this.maintenances.find({
      where: { status: In(ACTIVE_STATUSES) },
      relations: RELATIONS,
      order: { scheduledAt: 'ASC' },
    });
  }

  async findByVehicle(vehicleId: number) {
    await this.assertVehicleExists(vehicleId);
    return this.maintenances.find({
      where: { vehicleId },
      relations: RELATIONS,
      order: { scheduledAt: 'DESC' },
    });
  }

  /** Historial = mantenimientos COMPLETED del vehículo, en orden cronológico. */
  async historyByVehicle(vehicleId: number) {
    const vehicle = await this.assertVehicleExists(vehicleId);
    const maintenances = await this.maintenances.find({
      where: { vehicleId, status: MaintenanceStatus.COMPLETED },
      relations: RELATIONS,
      order: { finishedAt: 'ASC' },
    });
    return { vehicle, maintenances };
  }

  async findByMechanic(mechanicId: number) {
    if (!(await this.mechanics.exists({ where: { id: mechanicId } }))) {
      throw new NotFoundException(`El mecánico con id ${mechanicId} no existe`);
    }
    return this.maintenances.find({
      where: { mechanicId },
      relations: RELATIONS,
      order: { scheduledAt: 'DESC' },
    });
  }

  /** Mantenimientos asignados al técnico autenticado (con su taller). */
  async findMine(user: JwtPayload) {
    const mechanic = await this.mechanics.findOne({ where: { userId: user.sub } });
    if (!mechanic) return [];
    return this.maintenances.find({
      where: { mechanicId: mechanic.id },
      relations: RELATIONS,
      order: { scheduledAt: 'ASC' },
    });
  }

  async findOne(id: number, user: JwtPayload) {
    const maintenance = await this.findDetailed(id);
    await this.assertCanAccess(user, maintenance);
    return maintenance;
  }

  /** Auditoría: quién cambió qué estado y cuándo. */
  async auditTrail(id: number) {
    await this.findDetailed(id);
    return this.logs.find({ where: { maintenanceId: id }, order: { id: 'ASC' } });
  }

  /** Respuesta para el endpoint de integración externa (x-api-key). */
  async integrationHistoryByPlate(plate: string) {
    const normalized = plate.trim().toUpperCase();
    const vehicle = await this.vehicles.findOne({ where: { plate: normalized } });
    if (!vehicle) throw new NotFoundException(`El vehículo con placa ${normalized} no existe`);

    const maintenances = await this.maintenances.find({
      where: { vehicleId: vehicle.id, status: MaintenanceStatus.COMPLETED },
      relations: RELATIONS,
      order: { finishedAt: 'ASC' },
    });

    return {
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        available: vehicle.status === VehicleStatus.AVAILABLE,
      },
      maintenances: maintenances.map((m) => ({
        id: m.id,
        type: m.type,
        status: m.status,
        description: m.workDone ?? m.description,
        mileage: m.finalMileage ?? m.mileage,
        cost: m.finalCost,
        finishedAt: m.finishedAt,
        mechanic: { id: m.mechanic.id, name: m.mechanic.name },
        workshop: { id: m.workshop.id, name: m.workshop.name },
      })),
    };
  }

  // ---------------------------------------------------------------- helpers
  private async findDetailed(id: number) {
    const maintenance = await this.maintenances.findOne({ where: { id }, relations: RELATIONS });
    if (!maintenance) throw new NotFoundException(`El mantenimiento con id ${id} no existe`);
    return maintenance;
  }

  private async assertVehicleExists(vehicleId: number) {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException(`El vehículo con id ${vehicleId} no existe`);
    return vehicle;
  }

  /** Un TECHNICIAN solo puede tocar los mantenimientos asignados a su mecánico. */
  private async assertCanAccess(user: JwtPayload, maintenance: Pick<Maintenance, 'mechanicId'>) {
    if (user.role !== Role.TECHNICIAN) return;
    const mechanic = await this.mechanics.findOne({ where: { id: maintenance.mechanicId } });
    if (!mechanic || mechanic.userId !== user.sub) {
      throw new ForbiddenException('Este mantenimiento no está asignado a tu usuario');
    }
  }

  private audit(
    manager: EntityManager,
    maintenanceId: number,
    fromStatus: MaintenanceStatus | null,
    toStatus: MaintenanceStatus,
    changedByUserId: number | null,
  ) {
    return manager.save(
      manager.create(MaintenanceStatusLog, { maintenanceId, fromStatus, toStatus, changedByUserId }),
    );
  }
}
