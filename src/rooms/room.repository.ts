import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 🔥 DB enum과 100% 동일 (소문자)
 */
export type RoomStatus =
  | "waiting"
  | "playing"
  | "final_vote"
  | "finished";

export type Room = {
  id: string;
  host_user_id: string;
  status: RoomStatus;
  capacity: number;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string | null;
  influence_score: number;
  joined_at: string;
};

/**
 * ====== Room ======
 */
export const insertRoom = async (
  client: SupabaseClient,
  hostUserId: string,
  capacity: number
): Promise<Room> => {
  const { data, error } = await client
    .from("rooms")
    .insert({
      host_user_id: hostUserId,
      status: "waiting", // 🔥 반드시 소문자
      capacity,
    })
    .select("id,host_user_id,status,capacity,created_at")
    .single();

  if (error) throw error;
  return data;
};

export const fetchRoomById = async (
  client: SupabaseClient,
  roomId: string
): Promise<Room | null> => {
  const { data, error } = await client
    .from("rooms")
    .select("id,host_user_id,status,capacity,created_at")
    .eq("id", roomId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const updateRoomStatus = async (
  client: SupabaseClient,
  roomId: string,
  fromStatus: RoomStatus,
  toStatus: RoomStatus
): Promise<Room | null> => {
  const { data, error } = await client
    .from("rooms")
    .update({ status: toStatus }) // 🔥 소문자 enum
    .eq("id", roomId)
    .eq("status", fromStatus)
    .select("id,host_user_id,status,capacity,created_at")
    .single();

  if (error) throw error;
  return data;
};

/**
 * ====== Player ======
 */
export const insertPlayer = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
  nickname?: string
): Promise<Player> => {
  const { data, error } = await client
    .from("players")
    .insert({
      room_id: roomId,
      user_id: userId,
      nickname: nickname ?? null,
    })
    .select("id,room_id,user_id,nickname,influence_score,joined_at")
    .single();

  if (error) throw error;
  return data;
};

export const fetchPlayer = async (
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<Player | null> => {
  const { data, error } = await client
    .from("players")
    .select("id,room_id,user_id,nickname,influence_score,joined_at")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const listPlayers = async (
  client: SupabaseClient,
  roomId: string
): Promise<Player[]> => {
  const { data, error } = await client
    .from("players")
    .select("id,room_id,user_id,nickname,influence_score,joined_at")
    .eq("room_id", roomId);

  if (error) throw error;
  return data ?? [];
};

export const countPlayers = async (
  client: SupabaseClient,
  roomId: string
): Promise<number> => {
  const { count, error } = await client
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (error) throw error;
  return count ?? 0;
};
