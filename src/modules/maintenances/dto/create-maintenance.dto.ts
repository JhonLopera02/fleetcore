import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { MaintenanceType } from '../../../common/enums';

export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsString()
  @IsNotEmpty()
  description: string;

  /** Kilometraje del vehículo (no puede ser menor al actual del vehículo). */
  @IsInt()
  @Min(0)
  mileage: number;

  /** Fecha/hora programada en ISO 8601, ej. 2026-11-02T07:30:00.000Z */
  @IsDateString()
  scheduledAt: string;

  /** Duración estimada en minutos (por defecto 60). */
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(1440)
  estimatedMinutes?: number;

  @IsInt()
  vehicleId: number;

  @IsInt()
  mechanicId: number;

  @IsInt()
  workshopId: number;
}
