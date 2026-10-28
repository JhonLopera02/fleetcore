import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ActiveStatus } from '../../../common/enums';

export class CreateMechanicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  specialty: string;

  @IsOptional()
  @IsEnum(ActiveStatus)
  status?: ActiveStatus;

  /** Id de un usuario TECHNICIAN para vincularlo a este mecánico. */
  @IsOptional()
  @IsInt()
  userId?: number;
}
