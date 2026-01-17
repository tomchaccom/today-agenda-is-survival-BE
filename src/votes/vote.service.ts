import { PostgrestError } from "@supabase/supabase-js";

import { HttpError } from "../common/http-error";
import {
  countRoomPlayers,
  fetchRoomById,
  fetchRoomPlayer,
  updateRoomAdvanceQuestion,
  updateRoomResolved,
} from "../rooms/room.repository";
import {
  Vote,
  countQuestions,
  countVotesForQuestion,
  fetchQuestion,
  insertRoomResults,
  insertVote,
  listVotesForQuestion,
  listVotesForRoom,
} from "./vote.repository";

export type VoteState = "pending" | "advanced" | "resolved";

export type VoteResult = {
  state: VoteState;
  vote: Vote;
};

const ensureRoomPlaying = async (roomId: string) => {
  const room = await fetchRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }
  if (room.status !== "playing") {
    throw new HttpError(409, "Room is not playing");
  }
  if (room.current_qnum === null) {
    throw new HttpError(409, "Room is not initialized");
  }
  return room;
};

export const castVote = async (
  roomId: string,
  userId: string,
  questionId: string,
  decision: boolean
): Promise<VoteResult> => {
  const room = await ensureRoomPlaying(roomId);

  const player = await fetchRoomPlayer(roomId, userId);
  if (!player) {
    throw new HttpError(403, "Not a room player");
  }

  const question = await fetchQuestion(roomId, questionId);
  if (!question) {
    throw new HttpError(422, "Question not found in room");
  }

  if (question.qnum !== room.current_qnum) {
    throw new HttpError(409, "Question is not active");
  }

  let vote: Vote;
  try {
    vote = await insertVote(roomId, questionId, userId, decision);
  } catch (error) {
    const pgError = error as PostgrestError;
    if (pgError?.code === "23505") {
      throw new HttpError(409, "Already voted");
    }
    throw error;
  }

  const [playerCount, voteCount, totalQuestions] = await Promise.all(
    [
      countRoomPlayers(roomId),
      countVotesForQuestion(roomId, questionId),
      countQuestions(roomId),
    ]
  );

  if (voteCount < playerCount) {
    return { state: "pending", vote };
  }

  if (totalQuestions === 0) {
    throw new HttpError(422, "No questions configured");
  }

  if (room.current_qnum >= totalQuestions) {
    const votes = await listVotesForRoom(roomId);
    const scores = new Map<string, number>();
    for (const item of votes) {
      const current = scores.get(item.user_id) ?? 0;
      scores.set(item.user_id, current + (item.decision ? 1 : 0));
    }

    const results = Array.from(scores.entries()).map(
      ([user_id, score]) => ({
        room_id: roomId,
        user_id,
        score,
      })
    );

    await insertRoomResults(results);
    await updateRoomResolved(roomId, room.current_qnum);
    return { state: "resolved", vote };
  }

  await updateRoomAdvanceQuestion(roomId, room.current_qnum);
  return { state: "advanced", vote };
};

export const getVotesForQuestion = async (
  roomId: string,
  userId: string,
  questionId: string
): Promise<Vote[]> => {
  const room = await fetchRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  const isHost = room.host_user_id === userId;
  const player = await fetchRoomPlayer(roomId, userId);
  if (!isHost && !player) {
    throw new HttpError(403, "Access denied");
  }

  return listVotesForQuestion(roomId, questionId);
};
