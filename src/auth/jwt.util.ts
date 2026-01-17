import jwt from "jsonwebtoken";

/**
 * JWT payload 표준 타입
 * - 프로젝트 전역에서 이 형태만 사용
 */
export type JwtPayload = {
  userId: string;
  email?: string;
  provider?: "google";
  role?: "authenticated";
};

/**
 * Access Token 검증
 * - userId가 없으면 에러로 처리 (타입/런타임 모두 안전)
 */
export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  const decoded = jwt.verify(token, secret) as any;

  // 🔒 런타임 가드 (TS 몰라도 안전)
  const userId =
    decoded?.userId ??
    decoded?.sub ??
    decoded?.id;

  if (typeof userId !== "string") {
    throw new Error("Invalid JWT payload: userId not found");
  }

  return {
    userId,
    email: decoded.email,
    provider: decoded.provider,
    role: decoded.role,
  };
}
