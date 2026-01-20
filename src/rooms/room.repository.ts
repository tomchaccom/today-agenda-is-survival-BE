// src/rooms/room.repository.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { ROOM_STATUS, RoomStatus } from "./room.status";
import { HttpError } from "../common/http-error";

/* ================================
 * Types
 * ================================ */

export interface Room {
  id: string;
  host_user_id: string;
  status: RoomStatus;
  capacity: number;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string | null;
  score: number;
  joined_at: string;
}

/* ================================
 * Rooms
 * ================================ */

export const insertRoom = async (
  client: SupabaseClient,
  hostUserId: string,
  capacity: number
): Promise<Room> => {
  const { data, error } = await client
    .from("rooms")
    .insert({
      host_user_id: hostUserId,
      capacity,
      status: ROOM_STATUS.WAITING,
    })
    .select()
    .single();

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to create room"
    );
  }

  return data;
};

export const fetchRoomById = async (
  client: SupabaseClient,
  roomId: string
): Promise<Room | null> => {
  const { data, error } = await client
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to fetch room"
    );
  }

  return data;
};

export const updateRoomStatus = async (
  client: SupabaseClient,
  roomId: string,
  from: RoomStatus,
  to: RoomStatus
): Promise<void> => {
  const { error } = await client
    .from("rooms")
    .update({ status: to })
    .eq("id", roomId)
    .eq("status", from);

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to update room status"
    );
  }
};

/* ================================
 * Players
 * ================================ */

export const fetchPlayer = async (
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<Player | null> => {
  const { data, error } = await client
    .from("room_players")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to fetch player"
    );
  }

  return data;
};

export const insertPlayer = async (
  client: SupabaseClient,
  roomId: string,
  userId: string,
  nickname?: string
): Promise<Player> => {
  const { data, error } = await client
    .from("room_players")
    .insert({
      room_id: roomId,
      user_id: userId,
      nickname: nickname ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new HttpError(409, "Already joined");
    }

    if (error.code === "23503") {
      throw new HttpError(400, "Invalid room or user");
    }

    throw new HttpError(
      500,
      error.message || "Failed to insert player"
    );
  }

  return data;
};

export const listPlayers = async (
  client: SupabaseClient,
  roomId: string
): Promise<Player[]> => {
  const { data, error } = await client
    .from("room_players")
    .select("*")
    .eq("room_id", roomId);

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to list players"
    );
  }

  return data ?? [];
};

export const deletePlayer = async (
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<void> => {
  const { error } = await client
    .from("room_players")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to delete player"
    );
  }
};

export const deletePlayerWithCount = async (
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<number> => {
  const { error, count } = await client
    .from("room_players")
    .delete({ count: "exact" })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to delete player"
    );
  }

  return count ?? 0;
};

export const deletePlayerWithCount = async (
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<number> => {
  const { error, count } = await client
    .from("room_players")
    .delete({ count: "exact" })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to delete player"
    );
  }

  return count ?? 0;
};

export const deleteRoomPlayers = async (
  client: SupabaseClient,
  roomId: string
): Promise<void> => {
  const { error } = await client
    .from("room_players")
    .delete()
    .eq("room_id", roomId);

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to delete room players"
    );
  }
};

export const countPlayers = async (
  client: SupabaseClient,
  roomId: string
): Promise<number> => {
  const { data, error } = await client
    .from("room_players")
    .select("*")
    .eq("room_id", roomId);

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to count players"
    );
  }

  return data.length;
};

export const deleteRoom = async (
  client: SupabaseClient,
  roomId: string
): Promise<void> => {
  const { error } = await client
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    throw new HttpError(
      500,
      error.message || "Failed to delete room"
    );
  }
};


export const listRooms = async (
  client: SupabaseClient,
  filters: {
    status?: string;
    minPlayers?: number;
    onlyJoinable?: boolean;
    excludeResolved?: boolean;
  }
) => {
  let query = client
    .from("rooms")
    .select(`
      id,
      status,
      capacity,
      current_qnum,
      host_user_id,
      created_at,
      room_players(count)
    `);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.onlyJoinable) {
    query = query.eq("status", ROOM_STATUS.WAITING);
  }

  if (filters.excludeResolved) {
    query = query.neq("status", ROOM_STATUS.RESOLVED);
  }

  if (filters.minPlayers) {
    query = query.gte("room_players.count", filters.minPlayers);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
};
