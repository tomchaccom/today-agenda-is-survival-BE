// src/rooms/room.status.ts
export const ROOM_STATUS = {
  WAITING: "waiting",
  PLAYING: "playing",
  RESOLVED: "resolved",
} as const;

export type RoomStatus =
  typeof ROOM_STATUS[keyof typeof ROOM_STATUS];
