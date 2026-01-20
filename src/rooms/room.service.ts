// src/rooms/room.service.ts
import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import { supabaseAdmin } from "../supabase/supabase.client";
import { HttpError } from "../common/http-error";
import type { PostgrestError } from "@supabase/supabase-js";


import {
  Room,
  Player,
  fetchRoomById,
  fetchPlayer,
  insertRoom,
  insertPlayer,
  listPlayers,
  countPlayers,
  listRooms,
} from "./room.repository";

import { ROOM_STATUS, RoomStatus } from "./room.status";

/* ================================
 * Constants
 * ================================ */

const ALLOWED_CAPACITIES = new Set([3, 5, 7, 9]);

export interface RoomSummary {
  id: string;
  status: RoomStatus;
  capacity: number;
  currentPlayers: number;
  createdAt: string;
}

export interface RoomPlayerSummary {
  userId: string;
  nickname: string | null;
  isHost: boolean;
}

/* ================================
 * Internal helpers
 * ================================ */

const ensureMembership = async (
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<{ room: Room; isHost: boolean }> => {
  const room = await fetchRoomById(client, roomId);

  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  // 방장
  if (room.host_user_id === userId) {
    return { room, isHost: true };
  }

  // 참가자 여부 확인
  const player = await fetchPlayer(client, roomId, userId);
  if (!player) {
    throw new HttpError(403, "Access denied");
  }

  return { room, isHost: false };
};

/* ================================
 * Public services
 * ================================ */

export const createRoom = async (
  userId: string,
  capacity: number,
  nickname?: string
): Promise<Room> => {
  if (!ALLOWED_CAPACITIES.has(capacity)) {
    throw new HttpError(422, "Invalid capacity");
  }

  const room = await insertRoom(supabaseAdmin, userId, capacity);

  // 방장은 자동 참가
  await insertPlayer(
    supabaseAdmin,
    room.id,
    userId,
    nickname
  );

  return room;
};

export const joinRoom = async (
  roomId: string,
  userId: string,
  nickname?: string
): Promise<Player> => {
  console.log("[JOIN_ROOM] start", { roomId, userId, nickname });

  try {
    const room = await fetchRoomById(supabaseAdmin, roomId);
    if (!room) throw new HttpError(404, "Room not found");

    if (room.status !== ROOM_STATUS.WAITING) {
      throw new HttpError(409, "Room is not joinable");
    }

    const currentCount = await countPlayers(supabaseAdmin, roomId);
    if (currentCount >= room.capacity) {
      throw new HttpError(409, "Room is full");
    }

    const player = await insertPlayer(
      supabaseAdmin,
      roomId,
      userId,
      nickname
    );

    console.log("[JOIN_ROOM] insert success", player);
    return player;
  } catch (err: any) {
    console.error("[JOIN_ROOM] ERROR RAW =", err);

    if (err instanceof HttpError) {
      throw err;
    }

    if (err?.code === "23505") {
      throw new HttpError(409, "Already joined");
    }

    if (err?.code === "23503") {
      throw new HttpError(400, "Invalid room or user");
    }

    throw new HttpError(
      500,
      err?.message || "Failed to join room"
    );
  }
};


export const getRoom = async (
  roomId: string,
  userId: string
): Promise<Room> => {
  const { room } = await ensureMembership(
    supabaseAdmin,
    roomId,
    userId
  );
  return room;
};

export const getRoomPlayers = async (
  roomId: string,
  userId: string
): Promise<RoomPlayerSummary[]> => {
  const { room } = await ensureMembership(
    supabaseAdmin,
    roomId,
    userId
  );

  const players = await listPlayers(
    supabaseAdmin,
    roomId
  );

  console.log("[ROOM_PLAYERS] list", {
    roomId,
    count: players.length,
  });

  return players.map((player) => ({
    userId: player.user_id,
    nickname: player.nickname ?? null,
    isHost: player.user_id === room.host_user_id,
  }));
};

export const getRoomStatus = async (
  roomId: string,
  userId: string
): Promise<RoomStatus> => {
  const { room } = await ensureMembership(
    supabaseAdmin,
    roomId,
    userId
  );
  return room.status;
};
export const getRooms = async (
  userId: string | null,
  filters: {
    status?: string;
    minPlayers?: number;
    onlyJoinable?: boolean;
  }
): Promise<RoomSummary[]> => {
  const rooms = await listRooms(supabaseAdmin, {
    ...filters,
    excludeResolved: true,
  });

  console.log("[ROOMS] list", {
    status: filters.status,
    onlyJoinable: filters.onlyJoinable,
    count: rooms?.length ?? 0,
  });

  return (rooms ?? []).map((room) => {
    const rawCount = Array.isArray(room.room_players)
      ? room.room_players[0]?.count
      : (room.room_players as { count?: number } | undefined)
          ?.count;
    const currentPlayers = Number(rawCount ?? 0);

    return {
      id: room.id,
      status: room.status,
      capacity: room.capacity,
      currentPlayers,
      createdAt: room.created_at,
    };
  });
};
