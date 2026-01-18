import jwt from "jsonwebtoken";

export type JwtPayload = {
  userId: string;              // uuid
  email: string;
  provider: "google";
  role: "user" | "admin";
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

  // 1) uuid(sub)
  if (typeof decoded.sub !== "string") {
    throw new Error("Invalid JWT payload: sub missing");
  }
  if (!UUID_RE.test(decoded.sub)) {
    throw new Error("Invalid JWT payload: sub is not a UUID");
  }

  // 2) email
  if (typeof decoded.email !== "string") {
    throw new Error("Invalid JWT payload: email missing");
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
    provider: "google",
    role: "user",
  };
}
