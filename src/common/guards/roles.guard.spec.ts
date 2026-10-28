import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { RolesGuard } from './roles.guard';

const ctx = (user?: { role: Role }) =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  it('deja pasar si no hay @Roles()', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(ctx({ role: Role.TECHNICIAN }))).toBe(true);
  });

  it('permite al rol requerido', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(ctx({ role: Role.ADMIN }))).toBe(true);
  });

  it('lanza 403 si el rol no coincide', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    expect(() => guard.canActivate(ctx({ role: Role.TECHNICIAN }))).toThrow(ForbiddenException);
  });
});
