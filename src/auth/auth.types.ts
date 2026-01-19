// src/auth/auth.types.ts
import { Request } from "express";

export interface AuthUser {
  userId: string;
  email: string;
  provider: "google";
  role: "user" | "admin";
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  authToken?: string;
}
