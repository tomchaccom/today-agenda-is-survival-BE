import { Request, Response, NextFunction } from "express";
import { HttpError } from "../common/http-error";

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }

  next();
};
