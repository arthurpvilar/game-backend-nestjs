import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export const ROLES = ['player', 'admin', 'server'] as const;
export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Routes without it accept any authenticated user. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated user resolved by {@link AuthGuard}. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);

export function toAuthUser(payload: JwtPayload): AuthUser {
  return { id: payload.sub, username: payload.username, role: payload.role };
}

export function toJwtPayload(user: AuthUser): JwtPayload {
  return { sub: user.id, username: user.username, role: user.role };
}

/** Verifies the bearer token, then enforces the route's {@link Roles}. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      request.user = toAuthUser(await this.jwt.verifyAsync<JwtPayload>(token));
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (required && !required.includes(request.user.role)) {
      throw new ForbiddenException(`Requires role: ${required.join(' or ')}`);
    }
    return true;
  }
}
