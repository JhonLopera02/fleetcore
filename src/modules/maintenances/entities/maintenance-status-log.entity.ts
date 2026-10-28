import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MaintenanceStatus } from '../../../common/enums';
import { Maintenance } from './maintenance.entity';

/** Auditoría: una fila por cada cambio de estado de un mantenimiento. */
@Entity('maintenance_status_logs')
export class MaintenanceStatusLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  maintenanceId: number;

  @ManyToOne(() => Maintenance, (m) => m.statusLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenanceId' })
  maintenance: Maintenance;

  @Column({ type: 'enum', enum: MaintenanceStatus, nullable: true })
  fromStatus: MaintenanceStatus | null;

  @Column({ type: 'enum', enum: MaintenanceStatus })
  toStatus: MaintenanceStatus;

  /** Id del usuario que hizo el cambio (null si lo hizo el seeder). */
  @Column({ type: 'int', nullable: true })
  changedByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
