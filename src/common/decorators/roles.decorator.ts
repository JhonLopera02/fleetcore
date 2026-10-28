import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums';

export const ROLES_KEY = 'roles';

/** Declara qué roles pueden ejecutar el handler. El RolesGuard lo valida. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
