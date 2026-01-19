// src/chapters/chapters.service.ts
import { supabaseAdmin } from "../supabase/supabase.client";
import { HttpError } from "../common/http-error";
import {
  fetchCurrentQuestion,
  countVotesByDecision,
  fetchVotes,
  incrementPlayerScores,
  insertRoomResult,
  resolveRoom,
  insertVote,
} from "./chapters.repository";
import {
    QuestionRow,
    RoomRow,
    PlayerRow,
    VoteDecision,
  } from "./chapters.types";
  


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
const fetchRoom = async (roomId: string): Promise<RoomRow> => {
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("id, status, capacity, current_qnum")
    .eq("id", roomId)
    .single();

  if (error) throw error;
  if (!data) throw new HttpError(404, "Room not found");
  return data as RoomRow;
};

/**
 * rooms.current_qnum 증가 (RPC 없이 안전하게)
 */
const advanceRoomQnum = async (roomId: string): Promise<number> => {
  // 현재 qnum 읽고 +1
  const room = await fetchRoom(roomId);
  const next = (room.current_qnum ?? 1) + 1;

  const { error } = await supabaseAdmin
    .from("rooms")
    .update({ current_qnum: next })
    .eq("id", roomId);

  if (error) throw error;
  return next;
};

/**
 * final 계산: A 선택자들의 score 평균 vs B 선택자들의 score 평균
 */
const computeFinalWinnerByAverage = (
  votes: { user_id: string; decision: VoteDecision }[],
  players: PlayerRow[]
) => {
  const scoreMap = new Map(players.map((p) => [p.user_id, p.score]));

  const aScores: number[] = [];
  const bScores: number[] = [];

  for (const v of votes) {
    const s = scoreMap.get(v.user_id);
    if (typeof s !== "number") continue;

    if (v.decision === "A") aScores.push(s);
    if (v.decision === "B") bScores.push(s);
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((sum, x) => sum + x, 0) / arr.length;

  const aAvg = avg(aScores);
  const bAvg = avg(bScores);

  let winner: VoteDecision | "TIE" = "TIE";
  if (aAvg > bAvg) winner = "A";
  else if (bAvg > aAvg) winner = "B";

  return { winner, aAvg, bAvg, aCount: aScores.length, bCount: bScores.length };
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

  // 1) 현재 질문 조회 (rooms.current_qnum 기준)
  const question: QuestionRow = await fetchCurrentQuestion(
    supabaseAdmin,
    roomId
  );
  
  console.log("[CHAPTER_RESOLVE] current question =", question);

  // 2) 플레이어 목록
  const players = await listPlayers(roomId);
  if (players.length === 0) {
    throw new HttpError(409, "No players in room");
  }

  // 3) 투표 목록/집계
  const votes = await fetchVotes(supabaseAdmin, roomId, question.id);
  const { a, b } = await countVotesByDecision(
    supabaseAdmin,
    roomId,
    question.id
  );

  console.log("[CHAPTER_RESOLVE] votes count =", { a, b, total: votes.length });

  // 4) "모든 참가자 투표 완료" 강제 (원하면 이 체크 끌 수 있음)
  if (votes.length < players.length) {
    throw new HttpError(409, "Not all players have voted yet");
  }

  // 5) 분기: FINAL vs 일반
  if (!question.is_final) {
    // ---------- 일반 챕터 ----------
    let winner: VoteDecision | "TIE" = "TIE";
    if (a > b) winner = "A";
    else if (b > a) winner = "B";

    if (winner === "TIE") {
      throw new HttpError(409, "Tie vote - cannot resolve");
    }

    // winner 찍은 유저들에게 +0.1
    const winnerUserIds = votes
      .filter((v) => v.decision === winner)
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

    // 다음 qnum으로 진행
    const nextQnum = await advanceRoomQnum(roomId);

    console.log("[CHAPTER_RESOLVE] resolved normal chapter", {
      winner,
      nextQnum,
    });

    return {
      ok: true,
      type: "chapter",
      roomId,
      question: {
        id: question.id,
        chapter: question.chapter,
        qnum: question.qnum,
        is_final: question.is_final,
        content: question.content,
      },
      votes: { a, b },
      winner,
      reward: SCORE_REWARD,
      next_qnum: nextQnum,
    };
  } else {
    // ---------- FINAL ----------
    const final = computeFinalWinnerByAverage(
      votes as any,
      players
    );

    console.log("[CHAPTER_RESOLVE] final avg =", final);

    if (final.winner === "TIE") {
      throw new HttpError(409, "Final tie - cannot resolve");
    }

    // room_results 저장
    await insertRoomResult(
      supabaseAdmin,
      roomId,
      final.winner,
      final.aAvg,
      final.bAvg
    );

    // 방 종료
    await resolveRoom(supabaseAdmin, roomId);

    console.log("[CHAPTER_RESOLVE] resolved FINAL", {
      winner: final.winner,
      aAvg: final.aAvg,
      bAvg: final.bAvg,
    });

    return {
      ok: true,
      type: "final",
      roomId,
      question: {
        id: question.id,
        chapter: question.chapter,
        qnum: question.qnum,
        is_final: question.is_final,
        content: question.content,
      },
      votes: {
        a_count: final.aCount,
        b_count: final.bCount,
      },
      average_score: {
        a: final.aAvg,
        b: final.bAvg,
      },
      winner: final.winner,
      room_status: "resolved",
    };
  }
};
export const getCurrentQuestion = async (roomId: string) => {
    const question = await fetchCurrentQuestion(supabaseAdmin, roomId);
  
    return {
      id: question.id,
      chapter: question.chapter,
      qnum: question.qnum,
      is_final: question.is_final,
      content: question.content,
    };
  };
  
  export const voteForQuestion = async (
    roomId: string,
    questionId: number,
    userId: string,
    decision: "A" | "B"
  ) => {
    if (decision !== "A" && decision !== "B") {
      throw new HttpError(400, "Invalid decision");
    }
  
    try {
      await insertVote(
        supabaseAdmin,
        roomId,
        questionId,
        userId,
        decision
      );
    } catch (err: any) {
      if (err.code === "23505") {
        throw new HttpError(409, "Already voted");
      }
      throw err;
    }
  
    return { ok: true };
  };
  