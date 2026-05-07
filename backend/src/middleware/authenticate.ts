import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './errorHandler.js';
import { verifyAccessToken } from '../lib/jwt.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const auth = req.header('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new ApiError(401, 'Auth requerido', 'unauthorized');
    }
    const token = auth.slice(7);
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
    } else {
      next(new ApiError(401, 'Token inválido o expirado', 'unauthorized'));
    }
  }
}
