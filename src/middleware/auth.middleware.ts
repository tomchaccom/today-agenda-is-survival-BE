import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../auth/jwt.util";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1️⃣ Authorization 헤더 확인
  console.log("[AUTH] Authorization header:", req.headers.authorization);

  const rawAuth = req.headers.authorization;
  const authHeader =
    typeof rawAuth === "string" ? rawAuth : undefined;

  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("[AUTH] Missing or invalid Bearer prefix");
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  console.log("[AUTH] Extracted token (first 20 chars):", token.slice(0, 20));

  if (!token) {
    console.warn("[AUTH] Token string is empty");
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  try {
    // 2️⃣ 환경변수 확인
    console.log(
      "[AUTH] JWT_ACCESS_SECRET exists:",
      !!process.env.JWT_ACCESS_SECRET
    );

    // 3️⃣ 토큰 검증
    const payload = verifyAccessToken(token);
    console.log("[AUTH] Verified payload:", payload);

    req.user = {
      userId: payload.userId,
      email: payload.email,
      provider: "google",
      role: "user",
    };

    req.authToken = token;
    return next();
  } catch (error) {
    // 4️⃣ 에러 상세 로그
    console.error("[AUTH] JWT verify error:", error);

    const message =
      error instanceof jwt.TokenExpiredError
        ? "Access token expired"
        : "Invalid access token";

    return res.status(401).json({ error: message });
  }
};
