import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { VehicleStatus } from '../../../common/enums';

const upper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateVehicleDto {
  /** Placa única, ej. ABC123 */
  @Transform(upper)
  @IsString()
  @Length(5, 10)
  plate: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  @Min(1950)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsInt()
  @Min(0)
  mileage: number;

  /** Solo AVAILABLE o INACTIVE: IN_MAINTENANCE lo gestiona el sistema. */
  @IsOptional()
  @IsIn([VehicleStatus.AVAILABLE, VehicleStatus.INACTIVE])
  status?: VehicleStatus;
}
