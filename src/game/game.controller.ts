import { Router } from "express";

import { requireAuth } from "../auth/jwt.middleware";
import { HttpError } from "../common/http-error";
import {
  getChapterVotes,
  getCurrentChapter,
  getFinalResult,
  getGameState,
  getLeaderboard,
  listRoomChapters,
  resolveChapter,
  resolveFinal,
  startGame,
  voteChapter,
  voteLeader,
} from "./game.service";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Game
 *   description: 게임 진행 및 투표 API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GameState:
 *       type: object
 *       properties:
 *         room_id:
 *           type: string
 *         phase:
 *           type: string
 *           example: "IN_PROGRESS"
 *         current_chapter_order:
 *           type: number
 *           example: 2
 *         started_at:
 *           type: string
 *           format: date-time
 *         finished_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     Chapter:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         room_id:
 *           type: string
 *         order:
 *           type: number
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         option_a_label:
 *           type: string
 *         option_b_label:
 *           type: string
 *     ChapterVoteRequest:
 *       type: object
 *       required:
 *         - choice
 *       properties:
 *         choice:
 *           type: string
 *           enum: ["A", "B"]
 *           example: "A"
 *     LeaderVoteRequest:
 *       type: object
 *       required:
 *         - targetUserId
 *       properties:
 *         targetUserId:
 *           type: string
 *           example: "user-uuid"
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *         nickname:
 *           type: string
 *         influence_score:
 *           type: number
 *           example: 0.4
 */

/**
 * @swagger
 * /rooms/{roomId}/game/start:
 *   post:
 *     summary: 게임 시작
 *     description: 방장이 게임을 시작한다 (플레이어 수는 홀수여야 함).
 *     tags: [Game]
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
 *         description: 게임 시작 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   $ref: '#/components/schemas/GameState'
 *       403:
 *         description: 방장만 시작 가능
 *       409:
 *         description: 게임 상태 충돌
 *       401:
 *         description: 인증 필요
 */
router.post("/:roomId/game/start", requireAuth, async (req, res) => {
  try {
    const state = await startGame(
      req.authToken!,
      req.params.roomId,
      req.user!.userId
    );
    res.status(200).json({ state });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/game/state:
 *   get:
 *     summary: 게임 상태 조회
 *     tags: [Game]
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
 *         description: 게임 상태 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   $ref: '#/components/schemas/GameState'
 *       401:
 *         description: 인증 필요
 *       404:
 *         description: 방 없음
 */
router.get("/:roomId/game/state", requireAuth, async (req, res) => {
  try {
    const state = await getGameState(
      req.authToken!,
      req.params.roomId,
      req.user!.userId
    );
    res.status(200).json({ state });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/chapters:
 *   get:
 *     summary: 챕터 목록 조회
 *     tags: [Game]
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
 *         description: 챕터 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 chapters:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chapter'
 */
router.get("/:roomId/chapters", requireAuth, async (req, res) => {
  try {
    const chapters = await listRoomChapters(
      req.authToken!,
      req.params.roomId,
      req.user!.userId
    );
    res.status(200).json({ chapters });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/chapters/current:
 *   get:
 *     summary: 현재 챕터 조회
 *     tags: [Game]
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
 *         description: 현재 챕터
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 chapter:
 *                   $ref: '#/components/schemas/Chapter'
 */
router.get(
  "/:roomId/chapters/current",
  requireAuth,
  async (req, res) => {
    try {
      const chapter = await getCurrentChapter(
        req.authToken!,
        req.params.roomId,
        req.user!.userId
      );
      res.status(200).json({ chapter });
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /rooms/{roomId}/chapters/{chapterId}/vote:
 *   post:
 *     summary: 챕터 투표
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChapterVoteRequest'
 *     responses:
 *       201:
 *         description: 투표 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   type: string
 *                   example: "IN_PROGRESS"
 *                 vote:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     choice:
 *                       type: string
 *                       example: "A"
 *       409:
 *         description: 상태 충돌 또는 중복 투표
 */
router.post(
  "/:roomId/chapters/:chapterId/vote",
  requireAuth,
  async (req, res) => {
    try {
      const choice = req.body?.choice;
      if (choice !== "A" && choice !== "B") {
        res.status(422).json({ error: "Invalid choice" });
        return;
      }

      const result = await voteChapter(
        req.authToken!,
        req.params.roomId,
        req.params.chapterId,
        req.user!.userId,
        choice
      );
      res.status(201).json(result);
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /rooms/{roomId}/chapters/{chapterId}/resolve:
 *   post:
 *     summary: 챕터 결과 확정
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 챕터 결과 확정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   $ref: '#/components/schemas/GameState'
 */
router.post(
  "/:roomId/chapters/:chapterId/resolve",
  requireAuth,
  async (req, res) => {
    try {
      const state = await resolveChapter(
        req.authToken!,
        req.params.roomId,
        req.params.chapterId,
        req.user!.userId
      );
      res.status(200).json({ state });
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /rooms/{roomId}/final/leader-vote:
 *   post:
 *     summary: 리더 투표
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
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
 *             $ref: '#/components/schemas/LeaderVoteRequest'
 *     responses:
 *       201:
 *         description: 리더 투표 성공
 */
router.post(
  "/:roomId/final/leader-vote",
  requireAuth,
  async (req, res) => {
    try {
      const targetUserId = req.body?.targetUserId;
      if (!targetUserId || typeof targetUserId !== "string") {
        res.status(422).json({ error: "targetUserId is required" });
        return;
      }

      const vote = await voteLeader(
        req.authToken!,
        req.params.roomId,
        req.user!.userId,
        targetUserId
      );
      res.status(201).json({ vote });
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /rooms/{roomId}/final/resolve:
 *   post:
 *     summary: 리더 투표 결과 확정
 *     tags: [Game]
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
 *         description: 최종 결과 확정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 winnerUserId:
 *                   type: string
 *                 total:
 *                   type: number
 */
router.post(
  "/:roomId/final/resolve",
  requireAuth,
  async (req, res) => {
    try {
      const result = await resolveFinal(
        req.authToken!,
        req.params.roomId,
        req.user!.userId
      );
      res.status(200).json(result);
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /rooms/{roomId}/final/result:
 *   get:
 *     summary: 최종 결과 조회
 *     tags: [Game]
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
 *         description: 최종 결과 조회 성공
 */
router.get(
  "/:roomId/final/result",
  requireAuth,
  async (req, res) => {
    try {
      const result = await getFinalResult(
        req.authToken!,
        req.params.roomId,
        req.user!.userId
      );
      res.status(200).json(result);
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /rooms/{roomId}/leaderboard:
 *   get:
 *     summary: 리더보드 조회
 *     tags: [Game]
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
 *         description: 리더보드 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 players:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LeaderboardEntry'
 */
router.get(
  "/:roomId/leaderboard",
  requireAuth,
  async (req, res) => {
    try {
      const players = await getLeaderboard(
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
  }
);

/**
 * @swagger
 * /rooms/{roomId}/chapters/{chapterId}/votes:
 *   get:
 *     summary: 챕터 투표 목록 조회
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 투표 목록
 */
router.get(
  "/:roomId/chapters/:chapterId/votes",
  requireAuth,
  async (req, res) => {
    try {
      const votes = await getChapterVotes(
        req.authToken!,
        req.params.roomId,
        req.params.chapterId,
        req.user!.userId
      );
      res.status(200).json({ votes });
    } catch (error) {
      const status =
        error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

export default router;
