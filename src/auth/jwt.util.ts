import jwt from "jsonwebtoken";

/* =========================
 * Types
 * ========================= */
export type VerifiedAccessToken = {
  userId: string; // UUID
  email: string;
};

/* =========================
 * Issue Access Token
 * ========================= */
export function issueAccessToken(user: {
  id: string;      // Supabase users.id (UUID)
  email: string;
}) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  return jwt.sign(
    {
      sub: user.id,     // ✅ UUID
      email: user.email,
    },
    secret,
    {
      expiresIn: "15m",
    }
  );
}

/* =========================
 * Verify Access Token
 * ========================= */
export function verifyAccessToken(token: string): VerifiedAccessToken {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

  // sub = userId (UUID)
  if (typeof decoded.sub !== "string") {
    throw new Error("Invalid JWT payload: sub missing");
  }

  // email
  if (typeof decoded.email !== "string") {
    throw new Error("Invalid JWT payload: email missing");
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
  };
}
