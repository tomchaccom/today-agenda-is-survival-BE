import { SupabaseClient } from "@supabase/supabase-js";

export type GamePhase = "IN_PROGRESS" | "FINAL_VOTE" | "FINISHED";

export type GameState = {
  room_id: string;
  phase: GamePhase;
  current_chapter_order: number | null;
  started_at: string | null;
  finished_at: string | null;
};

export type Chapter = {
  id: string;
  room_id: string;
  order: number;
  title: string;
  description: string;
  option_a_label: string;
  option_b_label: string;
};

export type ChapterVote = {
  id: string;
  room_id: string;
  chapter_id: string;
  user_id: string;
  choice: "A" | "B";
};

export type ChapterResolution = {
  id: string;
  room_id: string;
  chapter_id: string;
  majority_choice: "A" | "B";
  resolved_at: string;
};

export type LeaderVote = {
  id: string;
  room_id: string;
  voter_user_id: string;
  target_user_id: string;
  weight: number;
};

export type Player = {
  room_id: string;
  user_id: string;
  nickname: string | null;
  influence_score: number;
};


export const fetchGameState = async (
  client: SupabaseClient,
  roomId: string
): Promise<GameState | null> => {
  const { data, error } = await client
    .from("game_state")
    .select(
      "room_id,phase,current_chapter_order,started_at,finished_at"
    )
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const insertGameState = async (
  client: SupabaseClient,
  roomId: string,
  phase: GamePhase,
  currentChapterOrder: number | null
): Promise<GameState> => {
  const { data, error } = await client
    .from("game_state")
    .insert({
      room_id: roomId,
      phase,
      current_chapter_order: currentChapterOrder,
      started_at: new Date().toISOString(),
    })
    .select(
      "room_id,phase,current_chapter_order,started_at,finished_at"
    )
    .single();

  if (error) throw error;
  return data;
};

export const updateGameState = async (
  client: SupabaseClient,
  roomId: string,
  phase: GamePhase,
  currentChapterOrder: number | null
): Promise<GameState> => {
  const { data, error } = await client
    .from("game_state")
    .update({
      phase,
      current_chapter_order: currentChapterOrder,
      finished_at:
        phase === "FINISHED" ? new Date().toISOString() : null,
    })
    .eq("room_id", roomId)
    .select(
      "room_id,phase,current_chapter_order,started_at,finished_at"
    )
    .single();

  if (error) throw error;
  return data;
};

export const listChapters = async (
  client: SupabaseClient,
  roomId: string
): Promise<Chapter[]> => {
  const { data, error } = await client
    .from("chapters")
    .select(
      "id,room_id,order,title,description,option_a_label,option_b_label"
    )
    .eq("room_id", roomId)
    .order("order", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const insertChapters = async (
  client: SupabaseClient,
  chapters: Omit<Chapter, "id">[]
): Promise<void> => {
  const { error } = await client.from("chapters").insert(chapters);
  if (error) throw error;
};

export const fetchChapterById = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string
): Promise<Chapter | null> => {
  const { data, error } = await client
    .from("chapters")
    .select(
      "id,room_id,order,title,description,option_a_label,option_b_label"
    )
    .eq("room_id", roomId)
    .eq("id", chapterId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const fetchChapterByOrder = async (
  client: SupabaseClient,
  roomId: string,
  order: number
): Promise<Chapter | null> => {
  const { data, error } = await client
    .from("chapters")
    .select(
      "id,room_id,order,title,description,option_a_label,option_b_label"
    )
    .eq("room_id", roomId)
    .eq("order", order)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const insertChapterVote = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string,
  userId: string,
  choice: "A" | "B"
): Promise<ChapterVote> => {
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

export const listChapterVotes = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string
): Promise<ChapterVote[]> => {
  const { data, error } = await client
    .from("chapter_votes")
    .select("id,room_id,chapter_id,user_id,choice")
    .eq("room_id", roomId)
    .eq("chapter_id", chapterId);

  if (error) throw error;
  return data ?? [];
};

export const countChapterVotes = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string
): Promise<number> => {
  const { count, error } = await client
    .from("chapter_votes")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("chapter_id", chapterId);

  if (error) throw error;
  return count ?? 0;
};

export const insertChapterResolution = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string,
  majorityChoice: "A" | "B"
): Promise<ChapterResolution> => {
  const { data, error } = await client
    .from("chapter_resolutions")
    .insert({
      room_id: roomId,
      chapter_id: chapterId,
      majority_choice: majorityChoice,
    })
    .select("id,room_id,chapter_id,majority_choice,resolved_at")
    .single();

  if (error) throw error;
  return data;
};

export const listPlayers = async (
  client: SupabaseClient,
  roomId: string
): Promise<Player[]> => {
  const { data, error } = await client
    .from("room_players")
    .select("room_id,user_id,nickname,influence_score")
    .eq("room_id", roomId);

  if (error) throw error;
  return (data ?? []) as Player[];
};


export const fetchPlayer = async (
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<Player | null> => {
  const { data, error } = await client
    .from("room_players")
    .select("room_id,user_id,nickname,influence_score")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as Player | null;
};


export const updatePlayerInfluence = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
  influenceScore: number
): Promise<void> => {
  const { error } = await client
    .from("room_players")
    .update({ influence_score: influenceScore })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) throw error;
};

export const insertLeaderVote = async (
  client: SupabaseClient,
  roomId: string,
  voterUserId: string,
  targetUserId: string,
  weight: number
): Promise<LeaderVote> => {
  const { data, error } = await client
    .from("leader_votes")
    .insert({
      room_id: roomId,
      voter_user_id: voterUserId,
      target_user_id: targetUserId,
      weight,
    })
    .select("id,room_id,voter_user_id,target_user_id,weight")
    .single();

  if (error) throw error;
  return data;
};

export const countLeaderVotes = async (
  client: SupabaseClient,
  roomId: string
): Promise<number> => {
  const { count, error } = await client
    .from("leader_votes")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (error) throw error;
  return count ?? 0;
};

export const listLeaderVotes = async (
  client: SupabaseClient,
  roomId: string
): Promise<LeaderVote[]> => {
  const { data, error } = await client
    .from("leader_votes")
    .select("id,room_id,voter_user_id,target_user_id,weight")
    .eq("room_id", roomId);

  if (error) throw error;
  return data ?? [];
};

export const applyChapterResolution = async (
  client: SupabaseClient,
  roomId: string,
  chapterId: string,
  majorityChoice: "A" | "B",
  winnerUserIds: string[],
  nextPhase: GamePhase,
  nextChapterOrder: number | null
): Promise<void> => {
  const { error } = await client.rpc("apply_chapter_resolution", {
    p_room_id: roomId,
    p_chapter_id: chapterId,
    p_majority_choice: majorityChoice,
    p_winner_user_ids: winnerUserIds,
    p_next_phase: nextPhase,
    p_next_chapter_order: nextChapterOrder,
  });

  if (error) throw error;
};

export const applyFinalResolution = async (
  client: SupabaseClient,
  roomId: string
): Promise<void> => {
  const { error } = await client.rpc("apply_final_resolution", {
    p_room_id: roomId,
  });

  if (error) throw error;
};
