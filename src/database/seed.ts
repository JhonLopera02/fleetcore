import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';
import { AppModule } from '../app.module';
import {
  ActiveStatus,
  MaintenanceStatus,
  MaintenanceType,
  Role,
  VehicleStatus,
} from '../common/enums';
import { MaintenanceStatusLog } from '../modules/maintenances/entities/maintenance-status-log.entity';
import { Maintenance } from '../modules/maintenances/entities/maintenance.entity';
import { Mechanic } from '../modules/mechanics/entities/mechanic.entity';
import { User } from '../modules/users/entities/user.entity';
import { Vehicle } from '../modules/vehicles/entities/vehicle.entity';
import { Workshop } from '../modules/workshops/entities/workshop.entity';

/**
 * Seeder IDEMPOTENTE: cada registro se busca por su clave natural (correo, placa,
 * nombre...) y solo se crea si no existe. Ejecutarlo dos veces no duplica nada.
 */
async function findOrCreate<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  where: Partial<T>,
  data: () => Promise<Partial<T>> | Partial<T>,
): Promise<T> {
  const existing = await manager.findOne(entity, { where: where as any });
  if (existing) return existing;
  return manager.save(manager.create(entity, (await data()) as any)) as Promise<T>;
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);

  await dataSource.transaction(async (m) => {
    // ---- Usuarios (1 ADMIN + 2 TECHNICIAN) ----
    const admin = await findOrCreate(m, User, { email: 'admin@fleetcore.com' }, async () => ({
      name: 'Administrador FleetCore',
      email: 'admin@fleetcore.com',
      password: await bcrypt.hash('Admin123*', 10),
      role: Role.ADMIN,
    }));
    const tech1 = await findOrCreate(m, User, { email: 'tecnico1@fleetcore.com' }, async () => ({
      name: 'Carlos Pérez',
      email: 'tecnico1@fleetcore.com',
      password: await bcrypt.hash('Tech123*', 10),
      role: Role.TECHNICIAN,
    }));
    const tech2 = await findOrCreate(m, User, { email: 'tecnico2@fleetcore.com' }, async () => ({
      name: 'Laura Gómez',
      email: 'tecnico2@fleetcore.com',
      password: await bcrypt.hash('Tech123*', 10),
      role: Role.TECHNICIAN,
    }));

    // ---- Mecánicos (2 activos vinculados a los técnicos + 1 inactivo) ----
    const carlos = await findOrCreate(m, Mechanic, { email: 'carlos.perez@fleetcore.com' }, () => ({
      name: 'Carlos Pérez', email: 'carlos.perez@fleetcore.com', specialty: 'Motor y transmisión',
      status: ActiveStatus.ACTIVE, userId: tech1.id,
    }));
    const laura = await findOrCreate(m, Mechanic, { email: 'laura.gomez@fleetcore.com' }, () => ({
      name: 'Laura Gómez', email: 'laura.gomez@fleetcore.com', specialty: 'Frenos y suspensión',
      status: ActiveStatus.ACTIVE, userId: tech2.id,
    }));
    await findOrCreate(m, Mechanic, { email: 'pedro.ramirez@fleetcore.com' }, () => ({
      name: 'Pedro Ramírez', email: 'pedro.ramirez@fleetcore.com', specialty: 'Electricidad automotriz',
      status: ActiveStatus.INACTIVE, userId: null,
    }));

    // ---- Talleres (1 activo + 1 inactivo) ----
    const centro = await findOrCreate(m, Workshop, { name: 'Taller Centro' }, () => ({
      name: 'Taller Centro', address: 'Calle 45 # 12-30, Barranquilla', status: ActiveStatus.ACTIVE,
    }));
    await findOrCreate(m, Workshop, { name: 'Taller Norte' }, () => ({
      name: 'Taller Norte', address: 'Carrera 51B # 80-15, Barranquilla', status: ActiveStatus.INACTIVE,
    }));

    // ---- Vehículos (2 AVAILABLE, 1 IN_MAINTENANCE, 1 INACTIVE) ----
    const abc = await findOrCreate(m, Vehicle, { plate: 'ABC123' }, () => ({
      plate: 'ABC123', brand: 'Chevrolet', model: 'NPR', year: 2021, mileage: 45000, status: VehicleStatus.AVAILABLE,
    }));
    await findOrCreate(m, Vehicle, { plate: 'DEF456' }, () => ({
      plate: 'DEF456', brand: 'Hino', model: '300', year: 2020, mileage: 80000, status: VehicleStatus.AVAILABLE,
    }));
    const ghi = await findOrCreate(m, Vehicle, { plate: 'GHI789' }, () => ({
      plate: 'GHI789', brand: 'Isuzu', model: 'NKR', year: 2019, mileage: 120000, status: VehicleStatus.IN_MAINTENANCE,
    }));
    await findOrCreate(m, Vehicle, { plate: 'JKL012' }, () => ({
      plate: 'JKL012', brand: 'Kenworth', model: 'T800', year: 2015, mileage: 250000, status: VehicleStatus.INACTIVE,
    }));

    // ---- Mantenimiento COMPLETED (historial de ABC123) ----
    const done = await findOrCreate(m, Maintenance, { vehicleId: abc.id, status: MaintenanceStatus.COMPLETED }, () => ({
      type: MaintenanceType.PREVENTIVE,
      description: 'Mantenimiento preventivo programado',
      mileage: 44000,
      scheduledAt: new Date('2026-09-15T14:00:00.000Z'),
      estimatedMinutes: 120,
      endsAt: new Date('2026-09-15T16:00:00.000Z'),
      status: MaintenanceStatus.COMPLETED,
      workDone: 'Cambio de aceite y filtros',
      finalCost: 350000,
      finishedAt: new Date('2026-09-15T16:30:00.000Z'),
      finalMileage: 45000,
      vehicleId: abc.id, mechanicId: laura.id, workshopId: centro.id,
    }));

    // ---- Mantenimiento IN_PROGRESS (el vehículo GHI789 está IN_MAINTENANCE) ----
    const running = await findOrCreate(m, Maintenance, { vehicleId: ghi.id, status: MaintenanceStatus.IN_PROGRESS }, () => ({
      type: MaintenanceType.CORRECTIVE,
      description: 'Reemplazo de pastillas de freno',
      mileage: 120000,
      scheduledAt: new Date('2026-10-27T13:00:00.000Z'),
      estimatedMinutes: 240,
      endsAt: new Date('2026-10-27T17:00:00.000Z'),
      status: MaintenanceStatus.IN_PROGRESS,
      vehicleId: ghi.id, mechanicId: carlos.id, workshopId: centro.id,
    }));

    // ---- Auditoría inicial (solo si el mantenimiento aún no tiene registros) ----
    for (const [maintenance, finalStatus] of [[done, MaintenanceStatus.COMPLETED], [running, MaintenanceStatus.IN_PROGRESS]] as const) {
      if (!(await m.count(MaintenanceStatusLog, { where: { maintenanceId: maintenance.id } }))) {
        await m.save(m.create(MaintenanceStatusLog, { maintenanceId: maintenance.id, fromStatus: null, toStatus: MaintenanceStatus.SCHEDULED, changedByUserId: admin.id }));
        await m.save(m.create(MaintenanceStatusLog, { maintenanceId: maintenance.id, fromStatus: MaintenanceStatus.SCHEDULED, toStatus: finalStatus, changedByUserId: admin.id }));
      }
    }
  });

  await app.close();
  console.log('Seed completado (idempotente).');
}

seed().catch((error) => {
  console.error('Error ejecutando el seed:', error);
  process.exit(1);
});