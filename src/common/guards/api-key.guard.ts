import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard específico para integraciones externas.
 * Compara el header "x-api-key" contra las claves de la variable API_KEYS (.env).
 * Se usa junto a @Public() para saltarse el JWT en ese endpoint.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const received = request.headers['x-api-key'];
    const validKeys = (this.config.get<string>('API_KEYS') ?? '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);

    if (!received) throw new UnauthorizedException('Falta el header x-api-key');
    if (!validKeys.includes(received)) {
      throw new UnauthorizedException('API Key incorrecta');
    }
    return true;
  }
}
