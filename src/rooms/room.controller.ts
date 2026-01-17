import { Router, Request, Response } from "express";

import { requireAuth } from "../auth/jwt.middleware";
import { HttpError } from "../common/http-error";
import {
  createRoom,
  getRoom,
  getRoomPlayers,
  joinRoom,
} from "./room.service";

const router = Router();

/**
 * 공통 인증 가드
 */
function assertAuthenticated(req: Request): asserts req is Request & {
  user: { userId: string };
  authToken: string;
} {
  if (!req.user || !req.user.userId || !req.authToken) {
    throw new HttpError(401, "Unauthorized");
  }
}

/**
 * params string 가드
 */
function requireParam(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${name} is required`);
  }
  return value;
}

/**
 * 방 생성
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    assertAuthenticated(req);

    const capacity = Number(req.body?.capacity);
    const nickname = req.body?.nickname;

    if (!nickname || typeof nickname !== "string") {
      return res.status(422).json({ error: "nickname is required" });
    }

    const room = await createRoom(
      req.authToken,
      req.user.userId,
      capacity,
      nickname
    );

    res.status(201).json({ room });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * 방 참여
 */
router.post("/:roomId/join", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const nickname = req.body?.nickname;
    if (!nickname || typeof nickname !== "string") {
      return res.status(422).json({ error: "nickname is required" });
    }

    const player = await joinRoom(
      req.authToken,
      roomId,
      req.user.userId,
      nickname
    );

    res.status(201).json({ player });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * 방 상세 조회
 */
router.get("/:roomId", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const room = await getRoom(
      req.authToken,
      roomId,
      req.user.userId
    );

    res.status(200).json({ room });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * 방 참여자 목록 조회
 */
router.get("/:roomId/players", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const players = await getRoomPlayers(
      req.authToken,
      roomId,
      req.user.userId
    );

    res.status(200).json({ players });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

export default router;
