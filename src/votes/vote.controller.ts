import { Router } from "express";

import { requireAuth } from "../auth/jwt.middleware";
import { HttpError } from "../common/http-error";
import { castVote, getVotesForQuestion } from "./vote.service";

const router = Router();

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
