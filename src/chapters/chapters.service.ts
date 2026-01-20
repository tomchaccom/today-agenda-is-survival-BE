// src/chapters/chapters.service.ts
import { supabaseAdmin } from "../supabase/supabase.client";
import { HttpError } from "../common/http-error";
import {
  advanceRoomQuestion,
  countVotesByChoice,
  fetchChapterById,
  fetchChapterByOrder,
  fetchChapterVotes,
  fetchCurrentChapter,
  incrementPlayerScores,
  insertChapterVote,
  insertRoomResult,
  listLeaderVotes,
  resolveRoom,
} from "./chapters.repository";
import { PlayerRow, VoteChoice } from "./chapters.types";

const SCORE_REWARD = 0.1;

/**
 * room_players 목록 조회
 */
const listPlayers = async (roomId: string): Promise<PlayerRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("room_players")
    .select("room_id, user_id, nickname, score, joined_at")
    .eq("room_id", roomId);

  if (error) throw error;
  return data ?? [];
};

/**
 * rooms 조회 (status/current_qnum 확인용)
 */
const fetchRoom = async (
  roomId: string
): Promise<{ id: string; status: string; current_qnum: number }> => {
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("id, status, current_qnum")
    .eq("id", roomId)
    .single();

  if (error) throw error;
  if (!data) throw new HttpError(404, "Room not found");
  return data;
};

const resolveFinalByLeaderVotes = async (roomId: string) => {
  const votes = await listLeaderVotes(supabaseAdmin, roomId);
  if (votes.length === 0) {
    throw new HttpError(409, "No leader votes");
  }

  const totals = { A: 0, B: 0 };
  for (const vote of votes) {
    totals[vote.choice] += vote.weight;
  }

  if (totals.A === totals.B) {
    throw new HttpError(409, "Leader vote is tied");
  }

  const winner: VoteChoice = totals.A > totals.B ? "A" : "B";

  await insertRoomResult(supabaseAdmin, roomId, winner, totals.A, totals.B);
  await resolveRoom(supabaseAdmin, roomId);

  return {
    ok: true,
    type: "final",
    roomId,
    totals,
    winner,
    room_status: "resolved",
  };
};

/**
 * 챕터 resolve (일반 + final)
 */
export const resolveChapter = async (roomId: string) => {
  console.log("[CHAPTER_RESOLVE] start", { roomId });

  // 0) 방 상태 확인
  const room = await fetchRoom(roomId);
  console.log("[CHAPTER_RESOLVE] room =", room);

  if (room.status !== "waiting" && room.status !== "playing") {
    throw new HttpError(409, "Room is not active");
  }

  const currentChapter = await fetchChapterByOrder(
    supabaseAdmin,
    roomId,
    room.current_qnum
  );

  if (!currentChapter) {
    return resolveFinalByLeaderVotes(roomId);
  }

  console.log("[CHAPTER_RESOLVE] current chapter =", currentChapter);

  // 1) 플레이어 목록
  const players = await listPlayers(roomId);
  if (players.length === 0) {
    throw new HttpError(409, "No players in room");
  }

  // 2) 투표 목록/집계
  const votes = await fetchChapterVotes(
    supabaseAdmin,
    roomId,
    currentChapter.id
  );
  const { a, b } = await countVotesByChoice(
    supabaseAdmin,
    roomId,
    currentChapter.id
  );

  console.log("[CHAPTER_RESOLVE] votes count =", { a, b, total: votes.length });

  // 3) 모든 참가자 투표 완료 확인
  if (votes.length < players.length) {
    throw new HttpError(409, "Not all players have voted yet");
  }

  let winner: VoteChoice | "TIE" = "TIE";
  if (a > b) winner = "A";
  else if (b > a) winner = "B";

  if (winner === "TIE") {
    throw new HttpError(409, "Tie vote - cannot resolve");
  }

  const winnerUserIds = votes
    .filter((v) => v.choice === winner)
    .map((v) => v.user_id);

  console.log("[CHAPTER_RESOLVE] winner =", winner, "reward users =", {
    count: winnerUserIds.length,
  });

  await incrementPlayerScores(
    supabaseAdmin,
    roomId,
    winnerUserIds,
    SCORE_REWARD
  );

  const nextQnum = await advanceRoomQuestion(supabaseAdmin, roomId);
  const nextChapter = await fetchChapterByOrder(
    supabaseAdmin,
    roomId,
    nextQnum
  );

  console.log("[CHAPTER_RESOLVE] resolved chapter", {
    winner,
    nextQnum,
  });

  return {
    ok: true,
    type: "chapter",
    roomId,
    chapter: currentChapter,
    votes: { a, b },
    winner,
    reward: SCORE_REWARD,
    next_qnum: nextQnum,
    next_phase: nextChapter ? "chapter" : "final",
  };
};

export const getCurrentChapter = async (roomId: string) => {
  const chapter = await fetchCurrentChapter(supabaseAdmin, roomId);

  return chapter;
};

export const voteForChapter = async (
  roomId: string,
  chapterId: string,
  userId: string,
  choice: VoteChoice
) => {
  if (choice !== "A" && choice !== "B") {
    throw new HttpError(400, "Invalid choice");
  }

  const room = await fetchRoom(roomId);
  const chapter = await fetchChapterById(
    supabaseAdmin,
    roomId,
    chapterId
  );

  if (!chapter) {
    throw new HttpError(404, "Chapter not found");
  }

  if (chapter.order !== room.current_qnum) {
    throw new HttpError(409, "Chapter is not active");
  }

  try {
    await insertChapterVote(
      supabaseAdmin,
      roomId,
      chapterId,
      userId,
      choice
    );
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new HttpError(409, "Already voted");
    }
    throw err;
  }

  return { ok: true };
};
