import type { JwtPayload } from "../auth/jwt.util";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      authToken?: string;
    }
  }
}

export {};
