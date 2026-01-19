import { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "../common/http-error";
import { QuestionRow } from "./chapters.types";


  
// ✅ 수정 버전
// chapters.repository.ts
export const fetchCurrentQuestion = async (
    client: SupabaseClient,
    roomId: string
  ): Promise<QuestionRow> => {
  
    const { data, error } = await client
      .from("rooms")
      .select(
        `
        current_qnum,
        questions!inner (
          id,
          chapter,
          qnum,
          is_final,
          content
        )
      `
      )
      .eq("id", roomId)
      .single();
  
    if (error) throw error;
  
    const questions = data?.questions;
  
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new HttpError(404, "Question not found");
    }
  
    // ⭐ 핵심: current_qnum에 맞는 질문 1개만 반환
    const current = questions.find(
      (q) => q.qnum === data.current_qnum
    );
  
    if (!current) {
      throw new HttpError(404, "Current question not found");
    }
  
    return current;
  };
  

/**
 * 특정 질문에 대한 A/B 투표 수 집계
 */
export const countVotesByDecision = async (
  client: SupabaseClient,
  roomId: string,
  questionId: number
) => {
  const { data, error } = await client
    .from("votes")
    .select("decision")
    .eq("room_id", roomId)
    .eq("question_id", questionId);

  if (error) throw error;

  let a = 0;
  let b = 0;

  data?.forEach((v) => {
    if (v.decision === "A") a++;
    if (v.decision === "B") b++;
  });

  return { a, b };
};

/**
 * 특정 질문에 투표한 유저 목록 조회
 * (점수 반영용)
 */
export const fetchVotes = async (
  client: SupabaseClient,
  roomId: string,
  questionId: number
) => {
  const { data, error } = await client
    .from("votes")
    .select("user_id, decision")
    .eq("room_id", roomId)
    .eq("question_id", questionId);

  if (error) throw error;
  return data ?? [];
};

/**
 * 승자(A/B)를 선택한 유저들의 점수 증가
 * chapter 전용 (+0.1)
 */
export const incrementPlayerScores = async (
    client: SupabaseClient,
    roomId: string,
    userIds: string[],
    amount: number
  ) => {
    if (userIds.length === 0) return;
  
    const { error } = await client.rpc("increment_player_scores", {
      p_room_id: roomId,
      p_user_ids: userIds,
      p_amount: amount,
    });
  
    if (error) throw error;
  };

/**
 * rooms.current_qnum + 1
 */
export const advanceRoomQuestion = async (
  client: SupabaseClient,
  roomId: string
) => {
  const { error } = await client
    .from("rooms")
    .update({
      current_qnum: client.rpc("increment_int", { x: 1 }),
    })
    .eq("id", roomId);

  if (error) throw error;
};

/**
 * FINAL 결과 저장
 */
export const insertRoomResult = async (
  client: SupabaseClient,
  roomId: string,
  winner: "A" | "B",
  aScore: number,
  bScore: number
) => {
  const { error } = await client
    .from("room_results")
    .insert({
      room_id: roomId,
      winner,
      a_score: aScore,
      b_score: bScore,
    });

  if (error) throw error;
};

/**
 * 방 상태 종료 처리
 */
export const resolveRoom = async (
  client: SupabaseClient,
  roomId: string
) => {
  const { error } = await client
    .from("rooms")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) throw error;
};

export const insertVote = async (
    client: SupabaseClient,
    roomId: string,
    questionId: number,
    userId: string,
    decision: "A" | "B"
  ) => {
    const { error } = await client
      .from("votes")
      .insert({
        room_id: roomId,
        question_id: questionId,
        user_id: userId,
        decision,
      });
  
    if (error) throw error;
  };
  