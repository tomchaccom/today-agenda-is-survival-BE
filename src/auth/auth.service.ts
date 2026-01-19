import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
}

export function issueTokens(user: AuthUser) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "2h" }
  );

  const refreshToken = jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "2h" }
  );

  return { accessToken, refreshToken };
}
