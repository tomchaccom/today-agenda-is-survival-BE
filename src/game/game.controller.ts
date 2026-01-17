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
 * 게임 시작
 */
router.post("/:roomId/game/start", requireAuth, async (req: Request, res: Response) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const state = await startGame(
      req.authToken,
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
 * 게임 상태 조회
 */
router.get("/:roomId/game/state", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const state = await getGameState(
      req.authToken,
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
 * 챕터 목록
 */
router.get("/:roomId/chapters", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const chapters = await listRoomChapters(
      req.authToken,
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
 * 현재 챕터
 */
router.get("/:roomId/chapters/current", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const chapter = await getCurrentChapter(
      req.authToken,
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
 * 챕터 투표
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
        req.authToken,
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
 * 챕터 결과 확정
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
        req.authToken,
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
 * 리더 투표
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
      req.authToken,
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
 * 최종 결과 확정
 */
router.post("/:roomId/final/resolve", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const result = await resolveFinal(
      req.authToken,
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
 * 최종 결과 조회
 */
router.get("/:roomId/final/result", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const result = await getFinalResult(
      req.authToken,
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
 * 리더보드
 */
router.get("/:roomId/leaderboard", requireAuth, async (req, res) => {
  try {
    assertAuthenticated(req);
    const roomId = requireParam(req.params.roomId, "roomId");

    const players = await getLeaderboard(
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

/**
 * 챕터 투표 목록
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
        req.authToken,
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
