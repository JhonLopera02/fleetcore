import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MaintenanceStatus, MaintenanceType } from '../../../common/enums';
import { numericTransformer } from '../../../common/utils/numeric.transformer';
import { Mechanic } from '../../mechanics/entities/mechanic.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Workshop } from '../../workshops/entities/workshop.entity';
import { MaintenanceStatusLog } from './maintenance-status-log.entity';

@Entity('maintenances')
export class Maintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: MaintenanceType })
  type: MaintenanceType;

  @Column({ type: 'text' })
  description: string;

  /** Kilometraje del vehículo al registrar el mantenimiento. */
  @Column({ type: 'int' })
  mileage: number;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  /** Duración estimada; sirve para detectar cruces de horario del mecánico. */
  @Column({ type: 'int', default: 60 })
  estimatedMinutes: number;

  /** scheduledAt + estimatedMinutes (se calcula al crear). */
  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  status: MaintenanceStatus;

  // ---- Datos de cierre (solo al completar) ----
  @Column({ type: 'text', nullable: true })
  workDone: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: numericTransformer })
  finalCost: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  finalMileage: number | null;

  // ---- Relaciones (RESTRICT: no se borran vehículos/mecánicos/talleres con historial) ----
  @Column()
  vehicleId: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.maintenances, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  mechanicId: number;

  @ManyToOne(() => Mechanic, (mechanic) => mechanic.maintenances, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'mechanicId' })
  mechanic: Mechanic;

  @Column()
  workshopId: number;

  @ManyToOne(() => Workshop, (workshop) => workshop.maintenances, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'workshopId' })
  workshop: Workshop;

  @OneToMany(() => MaintenanceStatusLog, (log) => log.maintenance)
  statusLogs: MaintenanceStatusLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
