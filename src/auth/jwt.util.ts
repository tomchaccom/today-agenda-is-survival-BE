import jwt from "jsonwebtoken";

/* =========================
 * Types
 * ========================= */
export type VerifiedAccessToken = {
  userId: string; // UUID
  email: string;
};

/* =========================
 * UUID Regex
 * ========================= */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      expiresIn: "2h",
    }
  );
}

/* =========================
 * Verify Access Token
 * ========================= */
export function verifyAccessToken(token: string): VerifiedAccessToken {
  const secret = process.env.JWT_ACCESS_SECRET;
  console.log("[JWT][VERIFY] secret exists =", !!secret);

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  console.log("[JWT][VERIFY] raw token =", token);

  const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
  console.log("[JWT][VERIFY] decoded =", decoded);

  if (typeof decoded.sub !== "string") {
    throw new Error("Invalid JWT payload: sub missing");
  }

  if (!UUID_RE.test(decoded.sub)) {
    throw new Error("Invalid JWT payload: sub is not UUID");
  }

  if (typeof decoded.email !== "string") {
    throw new Error("Invalid JWT payload: email missing");
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
  };
}
