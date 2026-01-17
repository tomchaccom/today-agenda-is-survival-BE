import { Router } from "express";

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
 * @swagger
 * tags:
 *   name: Rooms
 *   description: 방 생성 및 참여, 진행 관리 API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateRoomRequest:
 *       type: object
 *       required:
 *         - nickname
 *       properties:
 *         nickname:
 *           type: string
 *           example: "tom"
 *         capacity:
 *           type: number
 *           example: 5
 *
 *     JoinRoomRequest:
 *       type: object
 *       required:
 *         - nickname
 *       properties:
 *         nickname:
 *           type: string
 *           example: "guest1"
 *
 *     Room:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "room-uuid"
 *         host_user_id:
 *           type: string
 *           example: "user-uuid"
 *         status:
 *           type: string
 *           example: "WAITING"
 *         capacity:
 *           type: number
 *           example: 5
 *
 *     Player:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           example: "user_abc"
 *         nickname:
 *           type: string
 *           example: "tom"
 *         influence_score:
 *           type: number
 *           example: 0.2
 */

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: 방 생성
 *     description: 새로운 방을 생성하고, 요청한 사용자를 방장으로 등록한다.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
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
 *       422:
 *         description: nickname 누락 또는 형식 오류
 *       401:
 *         description: 인증 필요
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const capacity = Number(req.body?.capacity);
    const nickname = req.body?.nickname;

    if (!nickname || typeof nickname !== "string") {
      return res.status(422).json({ error: "nickname is required" });
    }

    const room = await createRoom(
      req.authToken!,
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

/**
 * @swagger
 * /rooms/{roomId}/join:
 *   post:
 *     summary: 방 참여
 *     description: 기존 방에 플레이어로 참여한다.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 참여할 방 ID
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
 *       422:
 *         description: nickname 누락 또는 형식 오류
 *       401:
 *         description: 인증 필요
 */
router.post("/:roomId/join", requireAuth, async (req, res) => {
  try {
    const nickname = req.body?.nickname;

    if (!nickname || typeof nickname !== "string") {
      return res.status(422).json({ error: "nickname is required" });
    }

    const player = await joinRoom(
      req.authToken!,
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

/**
 * @swagger
 * /rooms/{roomId}:
 *   get:
 *     summary: 방 상세 조회
 *     description: 방 정보 및 현재 상태를 조회한다.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 방 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *       404:
 *         description: 방을 찾을 수 없음
 *       401:
 *         description: 인증 필요
 */
router.get("/:roomId", requireAuth, async (req, res) => {
  try {
    const room = await getRoom(
      req.authToken!,
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

/**
 * @swagger
 * /rooms/{roomId}/players:
 *   get:
 *     summary: 방 참여자 목록 조회
 *     description: 현재 방에 참여 중인 플레이어 목록을 조회한다.
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 참여자 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 players:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Player'
 *       401:
 *         description: 인증 필요
 */
router.get("/:roomId/players", requireAuth, async (req, res) => {
  try {
    const players = await getRoomPlayers(
      req.authToken!,
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
