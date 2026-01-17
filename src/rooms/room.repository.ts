import { supabase } from "../supabase/supabase.client";

export type Room = {
  id: string;
  host_user_id: string;
  status: "waiting" | "playing" | "resolved";
  capacity: number;
  current_qnum: number | null;
  created_at: string;
  resolved_at: string | null;
};

export type RoomPlayer = {
  room_id: string;
  user_id: string;
  joined_at: string;
};

export const insertRoom = async (
  hostUserId: string,
  capacity: number
): Promise<Room> => {
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      host_user_id: hostUserId,
      status: "waiting",
      capacity,
      current_qnum: null,
    })
    .select(
      "id,host_user_id,status,capacity,current_qnum,created_at,resolved_at"
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const insertRoomPlayer = async (
  roomId: string,
  userId: string
): Promise<RoomPlayer> => {
  const { data, error } = await supabase
    .from("room_players")
    .insert({ room_id: roomId, user_id: userId })
    .select("room_id,user_id,joined_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const fetchRoomById = async (
  roomId: string
): Promise<Room | null> => {
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id,host_user_id,status,capacity,current_qnum,created_at,resolved_at"
    )
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const fetchRoomPlayer = async (
  roomId: string,
  userId: string
): Promise<RoomPlayer | null> => {
  const { data, error } = await supabase
    .from("room_players")
    .select("room_id,user_id,joined_at")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const countRoomPlayers = async (
  roomId: string
): Promise<number> => {
  const { count, error } = await supabase
    .from("room_players")
    .select("user_id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (error) {
    throw error;
  }

  return count ?? 0;
};

export const listRoomPlayers = async (
  roomId: string
): Promise<RoomPlayer[]> => {
  const { data, error } = await supabase
    .from("room_players")
    .select("room_id,user_id,joined_at")
    .eq("room_id", roomId);

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const updateRoomToPlaying = async (
  roomId: string
): Promise<Room | null> => {
  const { data, error } = await supabase
    .from("rooms")
    .update({ status: "playing", current_qnum: 1 })
    .eq("id", roomId)
    .eq("status", "waiting")
    .select(
      "id,host_user_id,status,capacity,current_qnum,created_at,resolved_at"
    );

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
};

export const updateRoomAdvanceQuestion = async (
  roomId: string,
  currentQnum: number
): Promise<Room | null> => {
  const { data, error } = await supabase
    .from("rooms")
    .update({ current_qnum: currentQnum + 1 })
    .eq("id", roomId)
    .eq("status", "playing")
    .eq("current_qnum", currentQnum)
    .select(
      "id,host_user_id,status,capacity,current_qnum,created_at,resolved_at"
    );

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
};

export const updateRoomResolved = async (
  roomId: string,
  currentQnum: number
): Promise<Room | null> => {
  const { data, error } = await supabase
    .from("rooms")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .eq("status", "playing")
    .eq("current_qnum", currentQnum)
    .select(
      "id,host_user_id,status,capacity,current_qnum,created_at,resolved_at"
    );

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
};
