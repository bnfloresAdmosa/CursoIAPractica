// Augmenta Express.Request con req.user (set por el middleware authenticate).

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        roles: Record<string, 'ADMIN' | 'USER'>;
      };
    }
  }
}

export {};
