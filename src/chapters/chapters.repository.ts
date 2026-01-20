import { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "../common/http-error";
import {
  ChapterRow,
  ChapterVoteRow,
  LeaderVoteRow,
  VoteChoice,
} from "./chapters.types";

export const fetchCurrentChapter = async (
  client: SupabaseClient,
  roomId: string
): Promise<ChapterRow> => {
  const { data: room, error: roomError } = await client
    .from("rooms")
    .select("current_qnum")
    .eq("id", roomId)
    .single();

  if (roomError) throw roomError;
  if (!room) throw new HttpError(404, "Room not found");

  const { data: chapter, error: chapterError } = await client
    .from("chapters")
    .select(
      "id,room_id,order,title,description,option_a_label,option_b_label"
    )
    .eq("room_id", roomId)
    .eq("order", room.current_qnum)
    .single();

  if (chapterError) throw chapterError;
  if (!chapter) throw new HttpError(404, "Current chapter not found");

  return chapter;
};

export const fetchChapterByOrder = async (
  client: SupabaseClient,
  roomId: string,
  order: number
): Promise<ChapterRow | null> => {
  const { data, error } = await client
    .from("chapters")
    .select(
      "id,room_id,order,title,description,option_a_label,option_b_label"
    )
    .eq("room_id", roomId)
    .eq("order", order)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
};

export const fetchChapterById = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string
): Promise<ChapterRow | null> => {
  const { data, error } = await client
    .from("chapters")
    .select(
      "id,room_id,order,title,description,option_a_label,option_b_label"
    )
    .eq("room_id", roomId)
    .eq("id", chapterId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
};

/**
 * 특정 챕터에 대한 A/B 투표 수 집계
 */
export const countVotesByChoice = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string
) => {
  const { data, error } = await client
    .from("chapter_votes")
    .select("choice")
    .eq("room_id", roomId)
    .eq("chapter_id", chapterId);

  if (error) throw error;

  let a = 0;
  let b = 0;

  data?.forEach((v) => {
    if (v.choice === "A") a++;
    if (v.choice === "B") b++;
  });

  return { a, b };
};

/**
 * 특정 챕터에 투표한 유저 목록 조회
 * (점수 반영용)
 */
export const fetchChapterVotes = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string
): Promise<Pick<ChapterVoteRow, "user_id" | "choice">[]> => {
  const { data, error } = await client
    .from("chapter_votes")
    .select("user_id, choice")
    .eq("room_id", roomId)
    .eq("chapter_id", chapterId);

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
 * rooms.current_qnum + 1 (read + update)
 */
export const advanceRoomQuestion = async (
  client: SupabaseClient,
  roomId: string
): Promise<number> => {
  const { data, error } = await client
    .from("rooms")
    .select("current_qnum")
    .eq("id", roomId)
    .single();

  if (error) throw error;
  if (!data) throw new HttpError(404, "Room not found");

  const next = (data.current_qnum ?? 0) + 1;

  const { error: updateError } = await client
    .from("rooms")
    .update({ current_qnum: next })
    .eq("id", roomId);

  if (updateError) throw updateError;
  return next;
};

/**
 * FINAL 결과 저장
 */
export const insertRoomResult = async (
  client: SupabaseClient,
  roomId: string,
  winner: VoteChoice,
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
      resolved_at: new Date().toISOString(),
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

export const insertChapterVote = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string,
  userId: string,
  choice: VoteChoice
): Promise<ChapterVoteRow> => {
  const { data, error } = await client
    .from("chapter_votes")
    .insert({
      room_id: roomId,
      chapter_id: chapterId,
      user_id: userId,
      choice,
    })
    .select("id,room_id,chapter_id,user_id,choice")
    .single();

  if (error) throw error;
  return data;
};

export const insertLeaderVote = async (
  client: SupabaseClient,
  roomId: string,
  voterUserId: string,
  choice: VoteChoice,
  weight: number
): Promise<LeaderVoteRow> => {
  const { data, error } = await client
    .from("leader_votes")
    .insert({
      room_id: roomId,
      voter_user_id: voterUserId,
      choice,
      weight,
    })
    .select("id,room_id,voter_user_id,choice,weight,created_at")
    .single();

  if (error) throw error;
  return data;
};

export const listLeaderVotes = async (
  client: SupabaseClient,
  roomId: string
): Promise<LeaderVoteRow[]> => {
  const { data, error } = await client
    .from("leader_votes")
    .select("id,room_id,voter_user_id,choice,weight,created_at")
    .eq("room_id", roomId);

  if (error) throw error;
  return data ?? [];
};

export const deleteChapterVotesByRoom = async (
  client: SupabaseClient,
  roomId: string
): Promise<void> => {
  const { error } = await client
    .from("chapter_votes")
    .delete()
    .eq("room_id", roomId);

  if (error) throw error;
};

export const deleteRoomResultsByRoom = async (
  client: SupabaseClient,
  roomId: string
): Promise<void> => {
  const { error } = await client
    .from("room_results")
    .delete()
    .eq("room_id", roomId);

  if (error) throw error;
};
