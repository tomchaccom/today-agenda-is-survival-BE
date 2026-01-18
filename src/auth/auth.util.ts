// src/auth/auth.util.ts
export {}; // 🔥 이 줄이 핵심

import { Request } from "express";
import { HttpError } from "../common/http-error";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  provider: "google";
  role: "user" | "admin";
}

export function assertAuthenticated(
  req: Request
): asserts req is Request & { user: AuthenticatedUser } {
  if (!req.user) {
    throw new HttpError(401, "Unauthenticated");
  }
}
