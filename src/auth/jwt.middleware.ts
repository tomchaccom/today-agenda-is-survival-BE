import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

/**
 * Access Token Payload 타입
 * - sub === Supabase users.id (uuid)
 */
interface AccessTokenPayload extends JwtPayload {
  sub: string;          // ✅ userId
  email: string;
  provider?: "google";
  role?: "user" | "admin";
}

/**
 * JWT 검증 유틸
 */
function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  const decoded = jwt.verify(token, secret) as AccessTokenPayload;

  if (!decoded.sub || typeof decoded.sub !== "string") {
    throw new Error("Invalid token payload (missing sub)");
  }

  if (typeof decoded.email !== "string") {
    throw new Error("Invalid token payload (missing email)");
  }

  return decoded;
}

/**
 * 인증 미들웨어
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = (
    req as Request & { cookies?: { access_token?: string } }
  ).cookies?.access_token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);

    /**
     * 🔑 핵심 수정 포인트
     * - userId = payload.sub
     */
    req.user = {
      userId: payload.sub,     // ✅ 여기!!!
      email: payload.email,
      provider: payload.provider ?? "google",
      role: payload.role ?? "user",
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
