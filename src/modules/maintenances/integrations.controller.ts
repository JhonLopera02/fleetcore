import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { MaintenancesService } from './maintenances.service';

/**
 * Endpoint para integraciones externas: se autentica con x-api-key (no con JWT).
 * @Public() desactiva el JwtAuthGuard global; el ApiKeyGuard hace la validación.
 */
@ApiTags('Integrations')
@ApiSecurity('api-key')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly maintenances: MaintenancesService) {}

  @Get('vehicles/:plate/maintenance-history')
  history(@Param('plate') plate: string) {
    return this.maintenances.integrationHistoryByPlate(plate);
  }
}
