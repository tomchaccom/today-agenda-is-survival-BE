import { PostgrestError } from "@supabase/supabase-js";

import { HttpError } from "../common/http-error";
import {
  Room,
  RoomPlayer,
  countRoomPlayers,
  fetchRoomById,
  fetchRoomPlayer,
  insertRoom,
  insertRoomPlayer,
  listRoomPlayers,
  updateRoomToPlaying,
} from "./room.repository";

const ALLOWED_CAPACITIES = new Set([3, 5, 7, 9]);

const ensureRoomExists = async (roomId: string): Promise<Room> => {
  const room = await fetchRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }
  return room;
};

const ensureRoomAccess = async (
  roomId: string,
  userId: string
): Promise<Room> => {
  const room = await ensureRoomExists(roomId);
  if (room.host_user_id === userId) {
    return room;
  }

  const player = await fetchRoomPlayer(roomId, userId);
  if (!player) {
    throw new HttpError(403, "Access denied");
  }

  return room;
};

export const createRoom = async (
  userId: string,
  capacity: number
): Promise<Room> => {
  if (!ALLOWED_CAPACITIES.has(capacity)) {
    throw new HttpError(422, "Invalid capacity");
  }

  const room = await insertRoom(userId, capacity);
  await insertRoomPlayer(room.id, userId);
  return room;
};

export const joinRoom = async (
  roomId: string,
  userId: string
): Promise<RoomPlayer> => {
  const room = await ensureRoomExists(roomId);

  if (room.status !== "waiting") {
    throw new HttpError(409, "Room is not joinable");
  }

  const alreadyJoined = await fetchRoomPlayer(roomId, userId);
  if (alreadyJoined) {
    throw new HttpError(409, "User already joined");
  }

  const currentCount = await countRoomPlayers(roomId);
  if (currentCount >= room.capacity) {
    throw new HttpError(409, "Room is full");
  }

  try {
    return await insertRoomPlayer(roomId, userId);
  } catch (error) {
    const pgError = error as PostgrestError;
    if (pgError?.code === "23505") {
      throw new HttpError(409, "User already joined");
    }
    throw error;
  }
};

export const startRoom = async (
  roomId: string,
  userId: string
): Promise<Room> => {
  const room = await ensureRoomExists(roomId);

  if (room.host_user_id !== userId) {
    throw new HttpError(403, "Only host can start");
  }

  if (room.status !== "waiting") {
    throw new HttpError(409, "Room already started");
  }

  const updated = await updateRoomToPlaying(roomId);
  if (!updated) {
    throw new HttpError(409, "Room already started");
  }

  return updated;
};

export const getRoom = async (
  roomId: string,
  userId: string
): Promise<Room> => ensureRoomAccess(roomId, userId);

export const getRoomPlayers = async (
  roomId: string,
  userId: string
): Promise<RoomPlayer[]> => {
  await ensureRoomAccess(roomId, userId);
  return listRoomPlayers(roomId);
};
