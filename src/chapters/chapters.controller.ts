// src/chapters/chapters.controller.ts
import { Router, Request, Response } from "express";

import { requireAuth } from "../middleware/require-auth";
import { assertAuthenticated } from "../auth/auth.util";
import { HttpError } from "../common/http-error";

import { resolveChapter } from "./chapters.service";

const router = Router();

/**
 * POST /rooms/:roomId/chapters/resolve
 */
router.post(
  "/:roomId/chapters/resolve",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      assertAuthenticated(req);

      const roomId = req.params.roomId;
      if (!roomId) {
        throw new HttpError(400, "roomId is required");
      }

      const result = await resolveChapter(roomId);

      return res.status(200).json(result);
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : 500;

      return res.status(status).json({
        error: (error as Error).message,
      });
    }
  }
);

export default router;
