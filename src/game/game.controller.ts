import { Router, Request, Response } from "express";

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


/**
 * @swagger
 * components:
 *   schemas:
 *     GameState:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: playing
 *         currentChapter:
 *           type: integer
 *           example: 1
 *
 *     VoteRequest:
 *       type: object
 *       required: [choice]
 *       properties:
 *         choice:
 *           type: string
 *           enum: [A, B]
 *
 *     LeaderVoteRequest:
 *       type: object
 *       required: [targetUserId]
 *       properties:
 *         targetUserId:
 *           type: string
 *           example: "user-uuid"
 */


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
 * @swagger
 * /rooms/{roomId}/game/start:
 *   post:
 *     summary: 게임 시작
 *     tags: [Game]
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
 */

router.post("/:roomId/game/start", requireAuth, async (req: Request, res: Response) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const state = await startGame(
      roomId,
      req.user.userId
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
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 현재 게임 상태
 */

router.get("/:roomId/game/state", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const state = await getGameState(
      roomId,
      req.user.userId
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
 *     tags: [Chapter]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 챕터 리스트
 */

router.get("/:roomId/chapters", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const chapters = await listRoomChapters(
      roomId,
      req.user.userId
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
 *     tags: [Chapter]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 현재 진행 중인 챕터
 */

router.get("/:roomId/chapters/current", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const chapter = await getCurrentChapter(
      roomId,
      req.user.userId
    );

    res.status(200).json({ chapter });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/chapters/{chapterId}/vote:
 *   post:
 *     summary: 챕터 투표
 *     tags: [Vote]
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
 *             $ref: '#/components/schemas/VoteRequest'
 *     responses:
 *       201:
 *         description: 투표 완료
 */

router.post(
  "/:roomId/chapters/:chapterId/vote",
  requireAuth,
  async (req, res) => {
    try {
      assertAuthenticated(req);
      const roomId = requireParam(req.params.roomId, "roomId");
      const chapterId = requireParam(req.params.chapterId, "chapterId");

      const choice = req.body?.choice;
      if (choice !== "A" && choice !== "B") {
        return res.status(422).json({ error: "Invalid choice" });
      }

      const result = await voteChapter(
        roomId,
        chapterId,
        req.user.userId,
        choice
      );

      res.status(201).json(result);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /rooms/{roomId}/chapters/{chapterId}/resolve:
 *   post:
 *     summary: 챕터 결과 확정
 *     tags: [Chapter]
 */

router.post(
  "/:roomId/chapters/:chapterId/resolve",
  requireAuth,
  async (req, res) => {
    try {
      assertAuthenticated(req);
      const roomId = requireParam(req.params.roomId, "roomId");
      const chapterId = requireParam(req.params.chapterId, "chapterId");

      const state = await resolveChapter(
        roomId,
        chapterId,
        req.user.userId
      );

      res.status(200).json({ state });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);
/**
 * @swagger
 * /rooms/{roomId}/final/leader-vote:
 *   post:
 *     summary: 리더 투표
 *     tags: [Final]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaderVoteRequest'
 *     responses:
 *       201:
 *         description: 리더 투표 완료
 */

router.post("/:roomId/final/leader-vote", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const targetUserId = req.body?.targetUserId;
    if (typeof targetUserId !== "string") {
      return res.status(422).json({ error: "targetUserId is required" });
    }

    const vote = await voteLeader(
      roomId,
      req.user.userId,
      targetUserId
    );

    res.status(201).json({ vote });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/final/resolve:
 *   post:
 *     summary: 최종 결과 확정
 *     tags: [Final]
 */

router.post("/:roomId/final/resolve", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const result = await resolveFinal(
      roomId,
      req.user.userId
    );

    res.status(200).json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/final/result:
 *   get:
 *     summary: 최종 결과 조회
 *     tags: [Final]
 */

router.get("/:roomId/final/result", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const result = await getFinalResult(
      roomId,
      req.user.userId
    );

    res.status(200).json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/leaderboard:
 *   get:
 *     summary: 리더보드 조회
 *     tags: [Leaderboard]
 */

router.get("/:roomId/leaderboard", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const players = await getLeaderboard(
      roomId,
      req.user.userId
    );

    res.status(200).json({ players });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/chapters/{chapterId}/votes:
 *   get:
 *     summary: 챕터 투표 목록 조회
 *     tags: [Vote]
 */

router.get(
  "/:roomId/chapters/:chapterId/votes",
  requireAuth,
  async (req, res) => {
    try {
      assertAuthenticated(req);
      const roomId = requireParam(req.params.roomId, "roomId");
      const chapterId = requireParam(req.params.chapterId, "chapterId");

      const votes = await getChapterVotes(
        roomId,
        chapterId,
        req.user.userId
      );

      res.status(200).json({ votes });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: (error as Error).message });
    }
  }
);

export default router;
