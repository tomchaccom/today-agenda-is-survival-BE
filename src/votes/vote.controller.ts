import { Router } from "express";

import { requireAuth } from "../auth/jwt.middleware";
import { HttpError } from "../common/http-error";
import { castVote, getVotesForQuestion } from "./vote.service";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Votes
 *   description: 투표 생성 및 결과 조회 API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CastVoteRequest:
 *       type: object
 *       required:
 *         - questionId
 *         - decision
 *       properties:
 *         questionId:
 *           type: string
 *           example: "question_123"
 *         decision:
 *           type: boolean
 *           example: true
 *
 *     VoteResult:
 *       type: object
 *       properties:
 *         questionId:
 *           type: string
 *           example: "question_123"
 *         agree:
 *           type: number
 *           example: 3
 *         disagree:
 *           type: number
 *           example: 1
 *
 *     Vote:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           example: "user_abc"
 *         decision:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /rooms/{roomId}/votes:
 *   post:
 *     summary: 투표하기
 *     description: |
 *       특정 질문(question)에 대해 찬성(true) 또는 반대(false) 투표를 한다.
 *
 *       - 한 사용자는 동일 질문에 대해 한 번만 투표 가능하다.
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 투표가 진행 중인 방 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CastVoteRequest'
 *     responses:
 *       201:
 *         description: 투표 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VoteResult'
 *       422:
 *         description: 잘못된 투표 요청
 *       401:
 *         description: 인증 필요
 */
router.post("/:roomId/votes", requireAuth, async (req, res) => {
  try {
    const { questionId, decision } = req.body ?? {};
    if (!questionId || typeof decision !== "boolean") {
      res.status(422).json({ error: "Invalid vote payload" });
      return;
    }

    const result = await castVote(
      req.params.roomId,
      req.user!.userId,
      questionId,
      decision
    );

    res.status(201).json(result);
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /rooms/{roomId}/votes:
 *   get:
 *     summary: 투표 결과 조회
 *     description: 특정 질문에 대한 현재 투표 결과를 조회한다.
 *     tags: [Votes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: 방 ID
 *       - in: query
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 결과를 조회할 질문 ID
 *     responses:
 *       200:
 *         description: 투표 결과 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 votes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vote'
 *       422:
 *         description: questionId 누락
 *       401:
 *         description: 인증 필요
 */
router.get("/:roomId/votes", requireAuth, async (req, res) => {
  try {
    const questionId = req.query.questionId;
    if (typeof questionId !== "string") {
      res.status(422).json({ error: "questionId is required" });
      return;
    }

    const votes = await getVotesForQuestion(
      req.params.roomId,
      req.user!.userId,
      questionId
    );

    res.status(200).json({ votes });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : 500;
    res.status(status).json({ error: (error as Error).message });
  }
});

export default router;
