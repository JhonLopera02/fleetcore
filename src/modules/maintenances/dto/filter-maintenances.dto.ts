import { IsEnum, IsOptional } from 'class-validator';
import { MaintenanceStatus, MaintenanceType } from '../../../common/enums';

export class FilterMaintenancesDto {
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsEnum(MaintenanceType)
  type?: MaintenanceType;
}
