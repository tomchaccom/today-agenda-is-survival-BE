import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "./jwt.util";

/**
 * 인증 미들웨어
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader =
    typeof req.headers.authorization === "string"
      ? req.headers.authorization
      : undefined;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  try {
    const payload = verifyAccessToken(token);

    /**
     * 🔑 핵심
     * - userId 는 항상 uuid
     * - email 은 보조 정보
     */
    req.user = {
      userId: payload.userId,
      email: payload.email,
      provider: "google",
      role: "user",
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
