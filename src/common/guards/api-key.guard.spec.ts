import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

const ctx = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;

describe('ApiKeyGuard', () => {
  const config = { get: jest.fn().mockReturnValue('key-1, key-2') };
  const guard = new ApiKeyGuard(config as unknown as ConfigService);

  it('acepta una clave válida de API_KEYS', () => {
    expect(guard.canActivate(ctx({ 'x-api-key': 'key-2' }))).toBe(true);
  });

  it('rechaza una clave incorrecta', () => {
    expect(() => guard.canActivate(ctx({ 'x-api-key': 'mala' }))).toThrow(UnauthorizedException);
  });

  it('rechaza si falta el header', () => {
    expect(() => guard.canActivate(ctx({}))).toThrow(/Falta el header/);
  });
});
