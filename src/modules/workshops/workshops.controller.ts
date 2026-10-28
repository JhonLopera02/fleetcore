import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveStatus, Role } from '../../common/enums';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { WorkshopsService } from './workshops.service';

@ApiTags('Workshops')
@ApiBearerAuth()
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshops: WorkshopsService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateWorkshopDto) {
    return this.workshops.create(dto);
  }

  /** Lista los talleres ACTIVOS. */
  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @Get()
  findActive() {
    return this.workshops.findActive();
  }

  @Roles(Role.ADMIN, Role.TECHNICIAN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workshops.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkshopDto) {
    return this.workshops.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.workshops.setStatus(id, ActiveStatus.ACTIVE);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.workshops.setStatus(id, ActiveStatus.INACTIVE);
  }
}
