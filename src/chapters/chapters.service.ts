// src/chapters/chapter.service.ts
import { supabaseAdmin } from "../supabase/supabase.client";
import { HttpError } from "../common/http-error";
import { ROOM_STATUS } from "../rooms/room.status";

export const resolveChapter = async (roomId: string) => {
  /* 1️⃣ 현재 방 정보 */
  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id, current_qnum, status")
    .eq("id", roomId)
    .single();

  if (!room) throw new HttpError(404, "Room not found");
  if (room.status !== ROOM_STATUS.PLAYING) {
    throw new HttpError(409, "Room is not in playing state");
  }

  /* 2️⃣ 현재 질문 */
  const { data: question } = await supabaseAdmin
    .from("questions")
    .select("id, qnum, is_final")
    .eq("qnum", room.current_qnum)
    .single();

  if (!question) {
    throw new HttpError(404, "Question not found");
  }

  /* 3️⃣ 투표 집계 */
  const { data: votes } = await supabaseAdmin
    .from("votes")
    .select("user_id, decision")
    .eq("room_id", roomId)
    .eq("question_id", question.id);

  if (!votes || votes.length === 0) {
    throw new HttpError(409, "No votes to resolve");
  }

  /* =========================
     일반 챕터
     ========================= */
  if (!question.is_final) {
    let aCount = 0;
    let bCount = 0;

    for (const v of votes) {
      if (v.decision === "A") aCount++;
      if (v.decision === "B") bCount++;
    }

    const winner: "A" | "B" = aCount >= bCount ? "A" : "B";

    /* 4️⃣ 점수 지급 (+0.1) */
    await supabaseAdmin.rpc("increment_score_for_winners", {
      p_room_id: roomId,
      p_question_id: question.id,
      p_winner: winner,
    });

    /* 5️⃣ 다음 챕터로 이동 (중복 resolve 방지) */
    const { data: updated, error } = await supabaseAdmin
      .from("rooms")
      .update({ current_qnum: room.current_qnum + 1 })
      .eq("id", roomId)
      .eq("current_qnum", room.current_qnum)
      .select("current_qnum")
      .single();

    if (error || !updated) {
      throw new HttpError(409, "Chapter already resolved");
    }

    return {
      type: "chapter",
      qnum: question.qnum,
      winner,
      aCount,
      bCount,
      next_qnum: updated.current_qnum,
    };
  }

  /* =========================
     FINAL 챕터
     ========================= */

  const { data: scores } = await supabaseAdmin
    .from("room_players")
    .select("user_id, score")
    .eq("room_id", roomId);

  let aTotal = 0,
    aCnt = 0,
    bTotal = 0,
    bCnt = 0;

  for (const v of votes) {
    const p = scores?.find((s) => s.user_id === v.user_id);
    if (!p) continue;

    if (v.decision === "A") {
      aTotal += p.score;
      aCnt++;
    }
    if (v.decision === "B") {
      bTotal += p.score;
      bCnt++;
    }
  }

  const aAvg = aCnt ? aTotal / aCnt : 0;
  const bAvg = bCnt ? bTotal / bCnt : 0;

  const winner: "A" | "B" = aAvg >= bAvg ? "A" : "B";

  /* 6️⃣ 결과 저장 */
  await supabaseAdmin.from("room_results").insert({
    room_id: roomId,
    winner,
    a_score: aAvg,
    b_score: bAvg,
  });

  /* 7️⃣ 방 종료 */
  await supabaseAdmin
    .from("rooms")
    .update({
      status: ROOM_STATUS.RESOLVED,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  return {
    type: "final",
    winner,
    aAvg,
    bAvg,
  };
};
