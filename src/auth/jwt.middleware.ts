import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { verifyAccessToken } from "./jwt.util";

/**
 * 인증 미들웨어
 * - Express Request 자체를 확장해서 사용 (AuthenticatedRequest ❌)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const rawAuth = req.headers.authorization;
  const authHeader =
    typeof rawAuth === "string" ? rawAuth : undefined;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  try {
    const payload = verifyAccessToken(token);

    // ✅ express.d.ts 에서 확장한 Request.user 사용
    req.user = {
      userId: payload.userId,
      email: payload.email,
      provider: payload.provider,
      role: payload.role,
    };

    req.authToken = token;
    next();
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? "Access token expired"
        : "Invalid access token";

    return res.status(401).json({ error: message });
  }
};
