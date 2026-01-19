// src/chapters/chapters.service.ts
import { supabaseAdmin } from "../supabase/supabase.client";
import { HttpError } from "../common/http-error";
import { ROOM_STATUS } from "../rooms/room.status";

export const resolveChapter = async (roomId: string) => {
  // 1️⃣ 방 정보 조회
  const { data: room, error: roomError } = await supabaseAdmin
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    throw new HttpError(404, "Room not found");
  }

  if (room.status !== ROOM_STATUS.WAITING) {
    throw new HttpError(409, "Room already resolved");
  }

  // 2️⃣ 현재 질문 조회
  const { data: question, error: qError } = await supabaseAdmin
    .from("questions")
    .select("*")
    .eq("qnum", room.current_qnum)
    .single();

  if (qError || !question) {
    throw new HttpError(404, "Question not found");
  }

  // 3️⃣ 투표 조회
  const { data: votes, error: voteError } = await supabaseAdmin
    .from("votes")
    .select("user_id, decision")
    .eq("room_id", roomId)
    .eq("question_id", question.id);

  if (voteError) {
    throw new HttpError(500, "Failed to load votes");
  }

  if (!votes || votes.length === 0) {
    throw new HttpError(400, "No votes submitted");
  }

  // 4️⃣ A/B 집계
  const aVotes = votes.filter(v => v.decision === "A");
  const bVotes = votes.filter(v => v.decision === "B");

  // =========================
  // 🟢 일반 챕터
  // =========================
  if (!question.is_final) {
    const winner = aVotes.length >= bVotes.length ? "A" : "B";
    const winners = winner === "A" ? aVotes : bVotes;

    // 4-1️⃣ 점수 +0.1
    const winnerIds = winners.map(v => v.user_id);

    if (winnerIds.length > 0) {
      const { error: scoreError } = await supabaseAdmin
        .from("room_players")
        .update({ score: supabaseAdmin.rpc("increment_score", { delta: 0.1 }) })
        .in("user_id", winnerIds)
        .eq("room_id", roomId);

      if (scoreError) {
        throw new HttpError(500, "Failed to update scores");
      }
    }

    // 4-2️⃣ 다음 챕터로 이동
    const { error: nextError } = await supabaseAdmin
      .from("rooms")
      .update({ current_qnum: room.current_qnum + 1 })
      .eq("id", roomId);

    if (nextError) {
      throw new HttpError(500, "Failed to advance chapter");
    }

    return {
      type: "chapter",
      winner,
      aCount: aVotes.length,
      bCount: bVotes.length,
      nextQnum: room.current_qnum + 1,
    };
  }

  // =========================
  // 🔴 FINAL 챕터
  // =========================

  const getAvgScore = async (userIds: string[]) => {
    if (userIds.length === 0) return 0;

    const { data, error } = await supabaseAdmin
      .from("room_players")
      .select("score")
      .in("user_id", userIds)
      .eq("room_id", roomId);

    if (error || !data) return 0;

    const sum = data.reduce((acc, cur) => acc + Number(cur.score), 0);
    return sum / data.length;
  };

  const aAvg = await getAvgScore(aVotes.map(v => v.user_id));
  const bAvg = await getAvgScore(bVotes.map(v => v.user_id));

  const finalWinner = aAvg >= bAvg ? "A" : "B";

  // 5️⃣ 결과 저장
  const { error: resultError } = await supabaseAdmin
    .from("room_results")
    .insert({
      room_id: roomId,
      winner: finalWinner,
      a_score: aAvg,
      b_score: bAvg,
      resolved_at: new Date().toISOString(),
    });

  if (resultError) {
    throw new HttpError(500, "Failed to save final result");
  }

  // 6️⃣ 방 종료
  await supabaseAdmin
    .from("rooms")
    .update({
      status: ROOM_STATUS.RESOLVED,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  return {
    type: "final",
    winner: finalWinner,
    aAvg,
    bAvg,
  };
};
