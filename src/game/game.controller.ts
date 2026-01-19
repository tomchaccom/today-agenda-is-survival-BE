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
 *         room_id:
 *           type: string
 *           example: "room-uuid"
 *         phase:
 *           type: string
 *           enum: [IN_PROGRESS, FINAL_VOTE, FINISHED]
 *           example: IN_PROGRESS
 *         current_chapter_order:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         started_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         finished_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     Chapter:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "chapter-uuid"
 *         room_id:
 *           type: string
 *           example: "room-uuid"
 *         order:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Expedition Selection"
 *         description:
 *           type: string
 *           example: "재원을 다시 원정대로 보내야 할까?"
 *         option_a_label:
 *           type: string
 *           example: "능력 기반 재파견 (Seongyeol)"
 *         option_b_label:
 *           type: string
 *           example: "추첨/순환 시스템 (Jaemyeon)"
 *
 *     ChapterVote:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "vote-uuid"
 *         room_id:
 *           type: string
 *           example: "room-uuid"
 *         chapter_id:
 *           type: string
 *           example: "chapter-uuid"
 *         user_id:
 *           type: string
 *           example: "user-uuid"
 *         choice:
 *           type: string
 *           enum: [A, B]
 *           example: A
 *
 *     LeaderVote:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "leader-vote-uuid"
 *         room_id:
 *           type: string
 *           example: "room-uuid"
 *         voter_user_id:
 *           type: string
 *           example: "user-uuid"
 *         target_user_id:
 *           type: string
 *           example: "user-uuid"
 *         weight:
 *           type: number
 *           example: 1.2
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
 *       403:
 *         description: 호스트만 시작 가능
 *       409:
 *         description: 상태 충돌(이미 시작/인원 조건 미달)
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   $ref: '#/components/schemas/GameState'
 *       404:
 *         description: 방 없음
 *       403:
 *         description: 접근 권한 없음
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 chapter:
 *                   $ref: '#/components/schemas/Chapter'
 *       409:
 *         description: 진행 중인 챕터 없음
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   type: string
 *                   enum: [IN_PROGRESS, FINAL_VOTE, FINISHED]
 *                 vote:
 *                   $ref: '#/components/schemas/ChapterVote'
 *       403:
 *         description: 플레이어 아님
 *       409:
 *         description: 상태 충돌(진행 중 아님/중복 투표/비활성 챕터)
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
 *     responses:
 *       200:
 *         description: 챕터 결과 확정
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   $ref: '#/components/schemas/GameState'
 *       403:
 *         description: 호스트만 확정 가능
 *       409:
 *         description: 상태 충돌(진행 중 아님/투표 없음)
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vote:
 *                   $ref: '#/components/schemas/LeaderVote'
 *       409:
 *         description: 상태 충돌(최종 투표 아님/중복 투표)
 */

router.post("/:roomId/final/leader-vote", requireAuth, async (req, res) => {
  assertAuthenticated(req);

  const roomId = requireParam(req.params.roomId, "roomId");
  const choice = req.body?.choice;

  if (choice !== "A" && choice !== "B") {
    return res.status(422).json({ error: "choice must be A or B" });
  }

  const vote = await voteLeader(
    roomId,
    req.user.userId,
    choice // 🔥 이제 userId가 아니라 A/B
  );

  res.status(201).json({ vote });
});


/**
 * @swagger
 * /rooms/{roomId}/final/resolve:
 *   post:
 *     summary: 최종 결과 확정
 *     tags: [Final]
 *     responses:
 *       200:
 *         description: 최종 결과 확정
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 winnerUserId:
 *                   type: string
 *                   example: "user-uuid"
 *                 total:
 *                   type: number
 *                   example: 3.2
 *       403:
 *         description: 호스트만 확정 가능
 *       409:
 *         description: 상태 충돌(최종 투표 아님/투표 없음)
 */

router.post("/:roomId/final/resolve", requireAuth, async (req, res) => {
  assertAuthenticated(req);

  const roomId = requireParam(req.params.roomId, "roomId");
  const result = await resolveFinal(roomId, req.user.userId);

  res.json(result);
});


/**
 * @swagger
 * /rooms/{roomId}/final/result:
 *   get:
 *     summary: 최종 결과 조회
 *     tags: [Final]
 *     responses:
 *       200:
 *         description: 최종 결과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 winnerUserId:
 *                   type: string
 *                   example: "user-uuid"
 *                 totals:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *       409:
 *         description: 게임 미종료
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
 *     responses:
 *       200:
 *         description: 리더보드
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 players:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       room_id:
 *                         type: string
 *                       user_id:
 *                         type: string
 *                       nickname:
 *                         type: string
 *                         nullable: true
 *                       influence_score:
 *                         type: number
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
 *     responses:
 *       200:
 *         description: 챕터 투표 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 votes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ChapterVote'
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
