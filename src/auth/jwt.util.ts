import jwt from "jsonwebtoken";

export type JwtPayload = {
  userId: string;
  email: string;
  provider: "google";
};

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, getEnv("JWT_ACCESS_SECRET"), {
    expiresIn: ACCESS_EXPIRES_IN,
    subject: payload.userId,
  });

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, getEnv("JWT_REFRESH_SECRET"), {
    expiresIn: REFRESH_EXPIRES_IN,
    subject: payload.userId,
  });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, getEnv("JWT_ACCESS_SECRET")) as JwtPayload;
