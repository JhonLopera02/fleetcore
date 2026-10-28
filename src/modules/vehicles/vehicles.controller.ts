import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { FilterVehiclesDto } from './dto/filter-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehicles.create(dto);
  }

  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @Get()
  findAll(@Query() filter: FilterVehiclesDto) {
    return this.vehicles.findAll(filter.status);
  }

  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @Get('plate/:plate')
  findByPlate(@Param('plate') plate: string) {
    return this.vehicles.findByPlate(plate);
  }

  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicles.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(id, dto);
  }

  /** Eliminación lógica (pasa a INACTIVE). */
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehicles.remove(id);
  }
}
