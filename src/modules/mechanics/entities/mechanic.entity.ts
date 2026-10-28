import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActiveStatus } from '../../../common/enums';
import { Maintenance } from '../../maintenances/entities/maintenance.entity';
import { User } from '../../users/entities/user.entity';

@Entity('mechanics')
export class Mechanic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 160 })
  email: string;

  @Column({ length: 80 })
  specialty: string;

  @Column({ type: 'enum', enum: ActiveStatus, default: ActiveStatus.ACTIVE })
  status: ActiveStatus;

  /** Usuario TECHNICIAN asociado (opcional). Permite al técnico ver "sus" mantenimientos. */
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User | null;

  /** Sin vínculo a un taller: un mecánico puede trabajar en varios talleres. */
  @OneToMany(() => Maintenance, (maintenance) => maintenance.mechanic)
  maintenances: Maintenance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
