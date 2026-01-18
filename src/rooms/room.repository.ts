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
  influence_score: number;
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


