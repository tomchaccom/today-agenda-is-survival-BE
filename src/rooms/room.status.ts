// src/rooms/room.status.ts
export const ROOM_STATUS = {
  WAITING: "WAITING",
  PLAYING: "PLAYING",
  FINISHED: "FINISHED",
} as const;

export type RoomStatus =
  typeof ROOM_STATUS[keyof typeof ROOM_STATUS];
