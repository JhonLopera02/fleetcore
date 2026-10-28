import { IsEnum, IsOptional } from 'class-validator';
import { VehicleStatus } from '../../../common/enums';

export class FilterVehiclesDto {
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
