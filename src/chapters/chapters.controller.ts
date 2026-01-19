// src/chapters/chapters.controller.ts
import { Router, Request, Response } from "express";
import { HttpError } from "../common/http-error";
import { requireAuth } from "../middleware/require-auth";
import { assertAuthenticated } from "../auth/auth.util";
import { resolveChapter } from "./chapters.service";
import { getCurrentQuestion, voteForQuestion} from "./chapters.service";

const router = Router();

/**
 * POST /rooms/:roomId/chapters/resolve
 * - 현재 챕터 투표 결과를 집계
 * - 일반 챕터: 다수결 → 점수 지급 → 다음 qnum
 * - FINAL 챕터: 평균 점수로 지도자 결정 → 방 종료
 */
router.post(
  "/rooms/:roomId/chapters/resolve",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // 🔐 인증 보장
      assertAuthenticated(req);

      const { roomId } = req.params;
      if (typeof roomId !== "string" || roomId.length === 0) {
        throw new HttpError(400, "Invalid roomId");
      }

      // ✅ 핵심 로직은 service에 위임
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

/**
 * @swagger
 * /rooms/{roomId}/chapters/current:
 *   get:
 *     tags: [Chapters]
 *     summary: 현재 질문 조회
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/rooms/:roomId/chapters/current",
    requireAuth,
    async (req, res) => {
      try {
        assertAuthenticated(req);
  
        const { roomId } = req.params;

        if (typeof roomId !== "string") {
            throw new HttpError(400, "Invalid roomId");
          }
        const question = await getCurrentQuestion(roomId);
  
        res.status(200).json(question);
      } catch (e) {
        const status = e instanceof HttpError ? e.status : 500;
        res.status(status).json({ error: (e as Error).message });
      }
    }
  );
  
  /**
 * @swagger
 * /rooms/{roomId}/chapters/{questionId}/vote:
 *   post:
 *     tags: [Chapters]
 *     summary: 현재 질문에 투표
 *     security:
 *       - bearerAuth: []
 */
router.post(
    "/rooms/:roomId/chapters/:questionId/vote",
    requireAuth,
    async (req, res) => {
      try {
        assertAuthenticated(req);
  
        const { roomId, questionId } = req.params;
        const { decision } = req.body;

        if (typeof roomId !== "string") {
            throw new HttpError(400, "Invalid roomId");
          }
          
        const qid = Number(questionId);
        if (Number.isNaN(qid)) {
            throw new HttpError(400, "Invalid questionId");
        }
  
        await voteForQuestion(
          roomId,
          qid,
          req.user.userId,
          decision
        );
  
        res.status(201).json({ ok: true });
      } catch (e) {
        const status = e instanceof HttpError ? e.status : 500;
        res.status(status).json({ error: (e as Error).message });
      }
    }
  );
  