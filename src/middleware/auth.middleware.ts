import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../auth/jwt.util";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const rawAuth = req.headers.authorization;
  const authHeader =
    typeof rawAuth === "string" ? rawAuth : undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Bearer token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Missing Bearer token" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      provider: payload.provider, // 🔥 추가
      role: payload.role,         // 🔥 추가
    };

    req.authToken = token;
    next();
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? "Access token expired"
        : "Invalid access token";
    res.status(401).json({ error: message });
  }
};
