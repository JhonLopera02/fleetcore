import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MaintenanceStatus } from '../../../common/enums';

export class UpdateMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;

  // ---- Obligatorios solo cuando status = COMPLETED ----
  /** Trabajo realizado */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  workDone?: string;

  /** Costo final */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalCost?: number;

  /** Fecha de finalización (ISO 8601) */
  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  /** Kilometraje final */
  @IsOptional()
  @IsInt()
  @Min(0)
  finalMileage?: number;
}
