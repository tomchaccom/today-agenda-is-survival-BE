import { Router } from "express";

import { requireAuth } from "../auth/jwt.middleware";
import { HttpError } from "../common/http-error";
import {
  createRoom,
  getRoom,
  getRoomPlayers,
  joinRoom,
  startRoom,
} from "./room.service";

const router = Router();

// POST /rooms
router.post("/", requireAuth, async (req, res) => {
  try {
    const capacity = Number(req.body?.capacity);
    const nickname = req.body?.nickname;

    if (!nickname || typeof nickname !== "string") {
      return res.status(422).json({ error: "nickname is required" });
    }

    const room = await createRoom(
      req.user!.userId,
      capacity,
      nickname
    );

    res.status(201).json({ room });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});


// POST /rooms/:roomId/join
router.post("/:roomId/join", requireAuth, async (req, res) => {
  try {
    const nickname = req.body?.nickname;

    if (!nickname || typeof nickname !== "string") {
      return res.status(422).json({ error: "nickname is required" });
    }

    const player = await joinRoom(
      req.params.roomId,
      req.user!.userId,
      nickname
    );

    res.status(201).json({ player });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});


router.post("/:roomId/start", requireAuth, async (req, res) => {
  try {
    const room = await startRoom(
      req.params.roomId,
      req.user!.userId
    );
    res.status(200).json({ room });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

router.get("/:roomId", requireAuth, async (req, res) => {
  try {
    const room = await getRoom(
      req.params.roomId,
      req.user!.userId
    );
    res.status(200).json({ room });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

router.get("/:roomId/players", requireAuth, async (req, res) => {
  try {
    const players = await getRoomPlayers(
      req.params.roomId,
      req.user!.userId
    );
    res.status(200).json({ players });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

export default router;
