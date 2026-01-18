import { Router, Request, Response } from "express";

import { requireAuth } from "../auth/jwt.middleware";
import { HttpError } from "../common/http-error";
import {
  createRoom,
  getRoom,
  getRoomPlayers,
  joinRoom,
} from "./room.service";

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "room-uuid"
 *         hostUserId:
 *           type: string
 *           example: "user-uuid"
 *         capacity:
 *           type: integer
 *           example: 3
 *         status:
 *           type: string
 *           example: waiting
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Player:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           example: "user-uuid"
 *         nickname:
 *           type: string
 *           example: "방장"
 *
 *     CreateRoomRequest:
 *       type: object
 *       required: [nickname]
 *       properties:
 *         capacity:
 *           type: integer
 *           example: 3
 *         nickname:
 *           type: string
 *           example: "방장"
 *
 *     JoinRoomRequest:
 *       type: object
 *       required: [nickname]
 *       properties:
 *         nickname:
 *           type: string
 *           example: "참가자1"
 */


const router = Router();

/**
 * 공통 인증 가드
 */
function assertAuthenticated(req: Request): asserts req is Request & {
  user: { userId: string; email: string };
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
 * @swagger
 * /rooms:
 *   post:
 *     summary: 방 생성
 *     tags: [Room]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoomRequest'
 *     responses:
 *       201:
 *         description: 방 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *       401:
 *         description: 인증 실패
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
 * @swagger
 * /rooms/{roomId}/join:
 *   post:
 *     summary: 방 참여
 *     tags: [Room]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinRoomRequest'
 *     responses:
 *       201:
 *         description: 방 참여 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 player:
 *                   $ref: '#/components/schemas/Player'
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

router.get("/test-auth", requireAuth, (req: Request, res: Response) => {
  try {
    assertAuthenticated(req);
    res.status(200).json({ ok: true, user: req.user });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

router.get("/", requireAuth, (req: Request, res: Response) => {
  try {
    assertAuthenticated(req);
    res.status(200).json({ ok: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}:
 *   get:
 *     summary: 방 상세 조회
 *     tags: [Room]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 방 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 */

router.get("/:roomId", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const room = await getRoom(
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
 * @swagger
 * /rooms/{roomId}/players:
 *   get:
 *     summary: 방 참여자 목록 조회
 *     tags: [Room]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 방 참여자 리스트
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 players:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Player'
 */

router.get("/:roomId/players", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const players = await getRoomPlayers(
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
