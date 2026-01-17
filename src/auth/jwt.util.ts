import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email?: string;
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET!
  ) as JwtPayload;
}
