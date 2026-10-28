import { Role } from '../enums';

/** Contenido del JWT (y de request.user después del JwtAuthGuard). */
export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}
