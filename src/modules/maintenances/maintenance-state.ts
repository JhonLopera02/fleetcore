import { ConflictException } from '@nestjs/common';
import { MaintenanceStatus } from '../../common/enums';

/** Estados "activos": ocupan al vehículo y al mecánico. */
export const ACTIVE_STATUSES = [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS];

/**
 * Máquina de estados de un mantenimiento.
 *   SCHEDULED   -> IN_PROGRESS | CANCELLED
 *   IN_PROGRESS -> COMPLETED   | CANCELLED
 *   COMPLETED   -> (final: no vuelve atrás)
 *   CANCELLED   -> (final: no pasa a IN_PROGRESS ni COMPLETED)
 */
export const ALLOWED_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.SCHEDULED]: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.COMPLETED]: [],
  [MaintenanceStatus.CANCELLED]: [],
};

/** Lanza 409 con un mensaje descriptivo si la transición no está permitida. */
export function assertValidTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
  if (from === to) {
    throw new ConflictException(`El mantenimiento ya se encuentra en estado ${from}`);
  }
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    const detail = allowed.length
      ? `Desde ${from} solo se permite pasar a: ${allowed.join(', ')}`
      : `${from} es un estado final y no admite más cambios`;
    throw new ConflictException(`Transición inválida ${from} → ${to}. ${detail}`);
  }
}
