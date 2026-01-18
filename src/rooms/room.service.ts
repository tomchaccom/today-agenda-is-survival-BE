import { PostgrestError } from "@supabase/supabase-js";
import { HttpError } from "../common/http-error";
import { supabaseAdmin } from "../supabase/supabase.client";
import {
  Player,
  Room,
  countPlayers,
  fetchPlayer,
  fetchRoomById,
  insertPlayer,
  insertRoom,
  listPlayers,
} from "./room.repository";
import { ROOM_STATUS, RoomStatus } from "./room.status";

const ALLOWED_CAPACITIES = new Set([3, 5, 7, 9]);

/**
 * ====== 공통 검증 (조회용, RLS 기반) ======
 */
const ensureMembership = async (
  roomId: string,
  userId: string
): Promise<{ room: Room; isHost: boolean }> => {
  const room = await fetchRoomById(supabaseAdmin, roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  if (room.host_user_id === userId) {
    return { room, isHost: true };
  }

  const player = await fetchPlayer(supabaseAdmin, roomId, userId);
  if (!player) {
    throw new HttpError(403, "Access denied");
  }

  return { room, isHost: false };
};

/**
 * ====== 방 생성 (🔥 server write → admin) ======
 */
export const createRoom = async (
  userId: string,
  capacity: number,
  nickname?: string
): Promise<Room> => {
  if (!ALLOWED_CAPACITIES.has(capacity)) {
    throw new HttpError(422, "Invalid capacity");
  }

  // status는 ROOM_STATUS.WAITING으로 insertRoom에서 처리
  const room = await insertRoom(supabaseAdmin, userId, capacity);

  await insertPlayer(
    supabaseAdmin,
    room.id,
    userId,
    nickname
  );

  return room;
};

/**
 * ====== 방 참여 (🔥 server write → admin) ======
 */
export const joinRoom = async (
  roomId: string,
  userId: string,
  nickname?: string
): Promise<Player> => {
  const room = await fetchRoomById(supabaseAdmin, roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  if (room.status !== ROOM_STATUS.WAITING) {
    throw new HttpError(409, "Room is not joinable");
  }

  const alreadyJoined = await fetchPlayer(
    supabaseAdmin,
    roomId,
    userId
  );
  if (alreadyJoined) {
    throw new HttpError(409, "User already joined");
  }

  const currentCount = await countPlayers(
    supabaseAdmin,
    roomId
  );
  if (currentCount >= room.capacity) {
    throw new HttpError(409, "Room is full");
  }

  try {
    return await insertPlayer(
      supabaseAdmin,
      roomId,
      userId,
      nickname
    );
  } catch (error) {
    const pgError = error as PostgrestError;
    if (pgError?.code === "23505") {
      throw new HttpError(409, "User already joined");
    }
    throw new HttpError(500, pgError?.message || "Database error");
  }
};

/**
 * ====== 조회 APIs (RLS 기반) ======
 */
export const getRoom = async (
  roomId: string,
  userId: string
): Promise<Room> => {
  const { room } = await ensureMembership(roomId, userId);
  return room;
};

export const getRoomPlayers = async (
  roomId: string,
  userId: string
): Promise<Player[]> => {
  await ensureMembership(roomId, userId);

  return listPlayers(supabaseAdmin, roomId);
};

export const getRoomStatus = async (
  roomId: string,
  userId: string
): Promise<RoomStatus> => {
  const { room } = await ensureMembership(roomId, userId);
  return room.status;
};
