import { ConflictException } from '@nestjs/common';
import { MaintenanceStatus as S } from '../../common/enums';
import { assertValidTransition } from './maintenance-state';

describe('assertValidTransition (reglas de cambio de estado)', () => {
  it.each([
    [S.SCHEDULED, S.IN_PROGRESS],
    [S.SCHEDULED, S.CANCELLED],
    [S.IN_PROGRESS, S.COMPLETED],
    [S.IN_PROGRESS, S.CANCELLED],
  ])('permite %s -> %s', (from, to) => {
    expect(() => assertValidTransition(from, to)).not.toThrow();
  });

  it.each([
    [S.COMPLETED, S.SCHEDULED],
    [S.COMPLETED, S.IN_PROGRESS],
    [S.COMPLETED, S.CANCELLED],
    [S.CANCELLED, S.IN_PROGRESS],
    [S.CANCELLED, S.COMPLETED],
    [S.SCHEDULED, S.COMPLETED],
  ])('rechaza %s -> %s con 409', (from, to) => {
    expect(() => assertValidTransition(from, to)).toThrow(ConflictException);
  });

  it('rechaza quedarse en el mismo estado', () => {
    expect(() => assertValidTransition(S.SCHEDULED, S.SCHEDULED)).toThrow(/ya se encuentra/);
  });

  it('el mensaje describe el estado final', () => {
    expect(() => assertValidTransition(S.COMPLETED, S.SCHEDULED)).toThrow(/estado final/);
  });
});
