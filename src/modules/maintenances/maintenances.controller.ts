import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { FilterMaintenancesDto } from './dto/filter-maintenances.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { MaintenancesService } from './maintenances.service';

@ApiTags('Maintenances')
@ApiBearerAuth()
@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly maintenances: MaintenancesService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateMaintenanceDto, @CurrentUser() user: JwtPayload) {
    return this.maintenances.create(dto, user);
  }

  /** Todos los mantenimientos (filtros opcionales ?status= &type=). */
  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query() filter: FilterMaintenancesDto) {
    return this.maintenances.findAll(filter);
  }

  /** Mantenimientos activos (SCHEDULED o IN_PROGRESS). */
  @Roles(Role.ADMIN)
  @Get('active')
  findActive() {
    return this.maintenances.findActive();
  }

  /** Mantenimientos asignados al técnico autenticado. */
  @Roles(Role.TECHNICIAN)
  @Get('my')
  findMine(@CurrentUser() user: JwtPayload) {
    return this.maintenances.findMine(user);
  }

  @Roles(Role.ADMIN)
  @Get('vehicle/:vehicleId')
  findByVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenances.findByVehicle(vehicleId);
  }

  /** Historial (mantenimientos completados) de un vehículo. */
  @Roles(Role.ADMIN)
  @Get('vehicle/:vehicleId/history')
  history(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenances.historyByVehicle(vehicleId);
  }

  @Roles(Role.ADMIN)
  @Get('mechanic/:mechanicId')
  findByMechanic(@Param('mechanicId', ParseIntPipe) mechanicId: number) {
    return this.maintenances.findByMechanic(mechanicId);
  }

  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.maintenances.findOne(id, user);
  }

  /** Auditoría de cambios de estado de un mantenimiento. */
  @Roles(Role.ADMIN)
  @Get(':id/audit')
  audit(@Param('id', ParseIntPipe) id: number) {
    return this.maintenances.auditTrail(id);
  }

  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.maintenances.updateStatus(id, dto, user);
  }
}
