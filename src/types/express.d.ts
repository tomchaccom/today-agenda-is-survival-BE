// src/types/express.d.ts
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        provider: "google";
        role: "user" | "admin";
      };
      authToken?: string;
    }
  }
}
