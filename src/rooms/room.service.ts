// src/rooms/room.service.ts
import { PostgrestError } from "@supabase/supabase-js";
import { HttpError } from "../common/http-error";
import {  supabaseAdmin } from "../supabase/supabase.client";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  Room,
  Player,
  fetchRoomById,
  fetchPlayer,
  insertRoom,
  insertPlayer,
  listPlayers,
  countPlayers,
} from "./room.repository";
import { ROOM_STATUS, RoomStatus } from "./room.status";

const ALLOWED_CAPACITIES = new Set([3, 5, 7, 9]);

const ensureMembership = async (
  client: SupabaseClient,
  roomId: string,
  userId: string
): Promise<{ room: Room; isHost: boolean }> => {
  const room = await fetchRoomById(client, roomId);

  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  // 방장인 경우
  if (room.host_user_id === userId) {
    return { room, isHost: true };
  }

  // 참가자인지 확인
  const player = await fetchPlayer(client, roomId, userId);
  if (!player) {
    throw new HttpError(403, "Access denied");
  }

  return { room, isHost: false };
};

export const createRoom = async (
  userId: string,
  capacity: number,
  nickname?: string
): Promise<Room> => {
  if (!ALLOWED_CAPACITIES.has(capacity)) {
    throw new HttpError(422, "Invalid capacity");
  }

  const room = await insertRoom(supabaseAdmin, userId, capacity);

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
    // 1️⃣ 방 조회
    const room = await fetchRoomById(supabaseAdmin, roomId);
    if (!room) {
      throw new HttpError(404, "Room not found");
    }

    if (room.status !== ROOM_STATUS.WAITING) {
      throw new HttpError(409, "Room is not joinable");
    }

    // 2️⃣ 현재 인원
    const currentCount = await countPlayers(supabaseAdmin, roomId);
    if (currentCount >= room.capacity) {
      throw new HttpError(409, "Room is full");
    }

    // 3️⃣ 참가 insert
    const player = await insertPlayer(
      supabaseAdmin,
      roomId,
      userId,
      nickname
    );

    console.log("[JOIN_ROOM] insert success", player);
    return player;
  } catch (err) {
    console.error("[JOIN_ROOM] ERROR KEYS =", Object.keys(err as any));
  console.error("[JOIN_ROOM] ERROR JSON =", JSON.stringify(err, null, 2));

  if (err instanceof HttpError) {
    throw err;
  }

  const pg = err as any;

  if (pg.code === "23505") {
    throw new HttpError(409, "Already joined");
  }

  if (pg.code === "23503") {
    throw new HttpError(400, "Invalid room or user");
  }

  throw new HttpError(
    500,
    pg.message || "Failed to join room"
  );
}
}


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
): Promise<Player[]> => {
  await ensureMembership(supabaseAdmin, roomId, userId);
  return listPlayers(supabaseAdmin, roomId);
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

