import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ActiveStatus } from '../../../common/enums';

export class CreateWorkshopDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;
}
