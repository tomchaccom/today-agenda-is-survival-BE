import type { Request } from "express";

type RoomSocketServer = {
  emit: (event: string, payload?: Record<string, unknown>) => void;
  to: (room: string) => {
    emit: (event: string, payload?: Record<string, unknown>) => void;
  };
};

export const getSocketServer = (
  req: Request
): RoomSocketServer | undefined =>
  (req.app?.locals?.io as RoomSocketServer | undefined);

export const emitRoomListUpdated = (
  io: RoomSocketServer | undefined,
  roomId?: string
) => {
  if (!io) return;
  console.log("[SOCKET][EMIT]", {
    event: "room:list:updated",
    roomId,
  });
  io.emit("room:list:updated");
};

export const emitRoomPlayersUpdated = (
  io: RoomSocketServer | undefined,
  roomId: string
) => {
  if (!io) return;
  console.log("[SOCKET][EMIT]", {
    event: "room:players:updated",
    roomId,
  });
  io.to(`room:${roomId}`).emit("room:players:updated", { roomId });
};

export const emitRoomDeleted = (
  io: RoomSocketServer | undefined,
  roomId: string
) => {
  if (!io) return;
  console.log("[SOCKET][EMIT]", {
    event: "room:deleted",
    roomId,
  });
  io.to(`room:${roomId}`).emit("room:deleted", { roomId });
};
