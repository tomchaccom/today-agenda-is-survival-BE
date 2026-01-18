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

  // 1️⃣ uuid (sub) 검증
  if (typeof decoded.sub !== "string") {
    throw new Error("Invalid JWT payload: sub missing");
  }

  // 2️⃣ email 검증
  if (typeof decoded.email !== "string") {
    throw new Error("Invalid JWT payload: email missing");
  }

  // 3️⃣ provider 검증
  if (decoded.provider !== "google") {
    throw new Error("Invalid JWT payload: provider");
  }

  // 4️⃣ role 검증
  if (decoded.role !== "authenticated") {
    throw new Error("Invalid JWT payload: role");
  }

  return {
    userId: decoded.sub,        // uuid
    email: decoded.email,       // string 확정
    provider: "google",         // 🔥 리터럴로 고정
    role: "user",      // 🔥 리터럴로 고정
  };
}
