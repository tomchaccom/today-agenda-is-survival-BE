// src/rooms/room.service.ts
import { PostgrestError } from "@supabase/supabase-js";
import { HttpError } from "../common/http-error";
import { createUserClient, supabaseAdmin } from "../supabase/supabase.client";
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
  clientToken: string,
  roomId: string,
  userId: string
): Promise<{ room: Room; isHost: boolean }> => {
  const client = createUserClient(clientToken);
  const room = await fetchRoomById(client, roomId);

  if (!room) throw new HttpError(404, "Room not found");

  if (room.host_user_id === userId) {
    return { room, isHost: true };
  }

  const player = await fetchPlayer(client, roomId, userId);
  if (!player) throw new HttpError(403, "Access denied");

  return { room, isHost: false };
};

export const createRoom = async (
  clientToken: string,
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
  clientToken: string,
  roomId: string,
  userId: string,
  nickname?: string
): Promise<Player> => {
  const room = await fetchRoomById(supabaseAdmin, roomId);
  if (!room) throw new HttpError(404, "Room not found");

  if (room.status !== ROOM_STATUS.WAITING) {
    throw new HttpError(409, "Room is not joinable");
  }

  const currentCount = await countPlayers(supabaseAdmin, roomId);
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
    const pg = error as PostgrestError;
    if (pg.code === "23505") {
      throw new HttpError(409, "Already joined");
    }
    throw error;
  }
};

export const getRoom = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<Room> => {
  const { room } = await ensureMembership(clientToken, roomId, userId);
  return room;
};

export const getRoomPlayers = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<Player[]> => {
  await ensureMembership(clientToken, roomId, userId);
  return listPlayers(createUserClient(clientToken), roomId);
};

export const getRoomStatus = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<RoomStatus> => {
  const { room } = await ensureMembership(clientToken, roomId, userId);
  return room.status;
};
