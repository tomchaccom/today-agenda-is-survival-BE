import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { JwtPayload, verifyAccessToken } from "./jwt.util";

export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
  authToken?: string;
};

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Bearer token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Missing Bearer token" });
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    req.authToken = token;
    next();
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? "Access token expired"
        : "Invalid access token";
    res.status(401).json({ error: message });
  }
};
