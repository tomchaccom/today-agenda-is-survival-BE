import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

/**
 * Access Token Payload 타입
 * - userId === Supabase users.id (uuid)
 */
interface AccessTokenPayload extends JwtPayload {
  sub: string; // uuid
  email: string;
  provider: "google";
  role: "user" | "admin";
}

/**
 * JWT 검증 유틸
 */
function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET!
  ) as AccessTokenPayload;

  if (!decoded.sub || typeof decoded.sub !== "string") {
    throw new Error("Invalid token payload (missing sub)");
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
