import jwt from "jsonwebtoken";

export type JwtPayload = {
  userId: string;              // uuid
  email: string;
  provider: "google";
  role: "user" | "admin";
};

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

  // 2) email
  if (typeof decoded.email !== "string") {
    throw new Error("Invalid JWT payload: email missing");
  }

  // 3) provider
  if (decoded.provider !== "google") {
    throw new Error("Invalid JWT payload: provider");
  }

  // 4) role: user | admin
  if (decoded.role !== "user" && decoded.role !== "admin") {
    throw new Error("Invalid JWT payload: role");
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
    provider: "google",
    role: decoded.role, // ✅ "user" | "admin"
  };
}
