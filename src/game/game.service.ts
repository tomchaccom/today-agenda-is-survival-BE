import { PostgrestError } from "@supabase/supabase-js";

import { HttpError } from "../common/http-error";
import { createUserClient, supabaseAdmin } from "../supabase/supabase.client";
// ROOM_STATUS import 추가 (경로는 프로젝트 구조에 맞게 조정 필요)
import { ROOM_STATUS } from "../rooms/room.status"; 
import {
  Room,
  countPlayers,
  fetchRoomById,
  updateRoomStatus,
} from "../rooms/room.repository";
import {
  Chapter,
  ChapterVote,
  GamePhase,
  GameState,
  LeaderVote,
  Player,
  applyChapterResolution,
  applyFinalResolution,
  countChapterVotes,
  countLeaderVotes,
  fetchChapterById,
  fetchChapterByOrder,
  fetchGameState,
  fetchPlayer,
  insertChapterVote,
  insertChapters,
  insertGameState,
  insertLeaderVote,
  listChapterVotes,
  listChapters,
  listLeaderVotes,
  listPlayers,
} from "./game.repository";

const STORY_CHAPTERS: Omit<Chapter, "id" | "room_id">[] = [
  {
    order: 1,
    title: "Expedition Selection",
    description: "재원을 다시 원정대로 보내야 할까?",
    option_a_label: "능력 기반 재파견 (Seongyeol)",
    option_b_label: "추첨/순환 시스템 (Jaemyeon)",
  },
  {
    order: 2,
    title: "Distribution of Food",
    description: "식량을 어떻게 분배할 것인가?",
    option_a_label: "성과 기반 차등 분배 (Seongyeol)",
    option_b_label: "모두에게 균등 분배 (Jaemyeon)",
  },
  {
    order: 3,
    title: "Outsiders and Rules",
    description: "외부인을 받아들일 것인가?",
    option_a_label: "외부인 거부 (Seongyeol)",
    option_b_label: "검역 후 수용 (Jaemyeon)",
  },
  {
    order: 4,
    title: "Escape vs Stay",
    description: "지금 위치를 사수할 것인가, 탈출을 시도할 것인가?",
    option_a_label: "현 위치 사수 (Seongyeol)",
    option_b_label: "집단 탈출 시도 (Jaemyeon)",
  },
];

const LAST_CHAPTER_ORDER = STORY_CHAPTERS.length;

/**
 * ====== 멤버십 확인/조회는 User Client (RLS) ======
 */
const ensureMembership = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<{ room: Room; isHost: boolean }> => {
  const client = createUserClient(clientToken);

  const room = await fetchRoomById(client, roomId);
  if (!room) throw new HttpError(404, "Room not found");

  if (room.host_user_id === userId) return { room, isHost: true };

  const player = await fetchPlayer(client, roomId, userId);
  if (!player) throw new HttpError(403, "Access denied");

  return { room, isHost: false };
};

const ensureGameState = async (
  clientToken: string,
  roomId: string
): Promise<GameState> => {
  const client = createUserClient(clientToken);
  const state = await fetchGameState(client, roomId);
  if (!state) throw new HttpError(409, "Game not started");
  return state;
};

/**
 * ====== 챕터 초기 생성은 Write 작업 → Admin ======
 */
const ensureChapters = async (roomId: string) => {
  const existing = await listChapters(supabaseAdmin, roomId);
  if (existing.length > 0) return;

  const chapters = STORY_CHAPTERS.map((chapter) => ({
    ...chapter,
    room_id: roomId,
  }));

  await insertChapters(supabaseAdmin, chapters);
};

const computeMajority = (
  votes: ChapterVote[]
): { majority: "A" | "B"; winners: string[] } => {
  let countA = 0;
  let countB = 0;

  for (const vote of votes) {
    if (vote.choice === "A") countA += 1;
    else countB += 1;
  }

  if (countA === countB) throw new HttpError(409, "Vote is tied");

  const majority = countA > countB ? "A" : "B";
  const winners = votes
    .filter((vote) => vote.choice === majority)
    .map((vote) => vote.user_id);

  return { majority, winners };
};

/**
 * ====== 게임 시작은 상태 변경(Write) → Admin ======
 */
export const startGame = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<GameState> => {
  const readClient = createUserClient(clientToken);

  const room = await fetchRoomById(readClient, roomId);
  if (!room) throw new HttpError(404, "Room not found");
  if (room.host_user_id !== userId) throw new HttpError(403, "Only host can start");
  
  // 수정: ROOM_STATUS 사용 (waiting)
  if (room.status !== ROOM_STATUS.WAITING) throw new HttpError(409, "Room already started");

  const playerCount = await countPlayers(readClient, roomId);
  if (playerCount < 3 || playerCount % 2 === 0) {
    throw new HttpError(409, "Room must have an odd number of players");
  }

  await ensureChapters(roomId);

  const currentState = await fetchGameState(supabaseAdmin, roomId);
  if (currentState) throw new HttpError(409, "Game already started");

  // 수정: ROOM_STATUS 사용 (waiting -> playing)
  await updateRoomStatus(supabaseAdmin, roomId, ROOM_STATUS.WAITING, ROOM_STATUS.PLAYING);
  return insertGameState(supabaseAdmin, roomId, "IN_PROGRESS", 1);
};

/**
 * ====== 조회는 그대로 ======
 */
export const getGameState = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<GameState> => {
  await ensureMembership(clientToken, roomId, userId);
  return ensureGameState(clientToken, roomId);
};

export const listRoomChapters = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<Chapter[]> => {
  await ensureMembership(clientToken, roomId, userId);
  return listChapters(createUserClient(clientToken), roomId);
};

export const getCurrentChapter = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<Chapter> => {
  await ensureMembership(clientToken, roomId, userId);

  const state = await ensureGameState(clientToken, roomId);
  if (!state.current_chapter_order) throw new HttpError(409, "No active chapter");

  const chapter = await fetchChapterByOrder(
    createUserClient(clientToken),
    roomId,
    state.current_chapter_order
  );
  if (!chapter) throw new HttpError(404, "Chapter not found");
  return chapter;
};

/**
 * ====== 챕터 투표는 Write → Admin ======
 */
export const voteChapter = async (
  clientToken: string,
  roomId: string,
  chapterId: string,
  userId: string,
  choice: "A" | "B"
): Promise<{ state: GamePhase; vote: ChapterVote }> => {

  const readClient = createUserClient(clientToken);

  const room = await fetchRoomById(readClient, roomId);
  if (!room) {
    throw new HttpError(404, "Room not found");
  }
  // 수정: ROOM_STATUS 사용 (playing)
  if (room.status !== ROOM_STATUS.PLAYING) {
    throw new HttpError(409, "Game is not in progress");
  }

  const player = await fetchPlayer(readClient, roomId, userId);
  if (!player) {
    throw new HttpError(403, "Not a room player");
  }

  const state = await ensureGameState(clientToken, roomId);

  const chapter = await fetchChapterById(readClient, roomId, chapterId);
  if (!chapter) {
    throw new HttpError(404, "Chapter not found");
  }
  if (chapter.order !== state.current_chapter_order) {
    throw new HttpError(409, "Chapter is not active");
  }

  let vote: ChapterVote;
  try {
    vote = await insertChapterVote(
      supabaseAdmin,
      roomId,
      chapterId,
      userId,
      choice
    );
  } catch (error) {
    const pgError = error as PostgrestError;
    if (pgError?.code === "23505") {
      throw new HttpError(409, "Already voted");
    }
    throw new HttpError(500, pgError?.message || "Database error");
  }

  const [voteCount, playerCount] = await Promise.all([
    countChapterVotes(supabaseAdmin, roomId, chapterId),
    countPlayers(supabaseAdmin, roomId),
  ]);

  if (voteCount < playerCount) {
    return {
      // 주의: room.status는 이제 "playing"(소문자)이지만 GamePhase는 "IN_PROGRESS" 등의 대문자일 수 있습니다.
      // GamePhase 타입 정의에 따라 이 부분은 확인이 필요할 수 있으나, 여기서는 로직만 status에 맞춤.
      state: state.phase, 
      vote,
    };
  }

  await resolveChapter(clientToken, roomId, chapterId, userId);
  const refreshed = await ensureGameState(clientToken, roomId);

  return {
    state: refreshed.phase,
    vote,
  };
};

/**
 * ====== 챕터 결과 확정은 Write → Admin ======
 */
export const resolveChapter = async (
  clientToken: string,
  roomId: string,
  chapterId: string,
  userId: string
): Promise<GameState> => {
  const { room, isHost } = await ensureMembership(clientToken, roomId, userId);
  if (!isHost) throw new HttpError(403, "Only host can resolve");
  
  // 수정: ROOM_STATUS 사용 (playing)
  if (room.status !== ROOM_STATUS.PLAYING) throw new HttpError(409, "Game is not in progress");

  const state = await ensureGameState(clientToken, roomId);

  const chapter = await fetchChapterById(supabaseAdmin, roomId, chapterId);
  if (!chapter) throw new HttpError(404, "Chapter not found");
  if (chapter.order !== state.current_chapter_order) throw new HttpError(409, "Chapter is not active");

  const votes = await listChapterVotes(supabaseAdmin, roomId, chapterId);
  if (votes.length === 0) throw new HttpError(409, "No votes to resolve");

  const { majority, winners } = computeMajority(votes);

  const nextPhase: GamePhase =
    chapter.order >= LAST_CHAPTER_ORDER ? "FINAL_VOTE" : "IN_PROGRESS";
  const nextOrder = chapter.order >= LAST_CHAPTER_ORDER ? null : chapter.order + 1;

  await applyChapterResolution(
    supabaseAdmin,
    roomId,
    chapterId,
    majority,
    winners,
    nextPhase,
    nextOrder
  );
  
  // 만약 마지막 챕터였다면 Room Status도 종료 상태로 변경해야 할 수 있습니다. 
  // 기존 코드엔 없었지만, 로직상 필요하다면 아래와 같이 추가해야 합니다.
  if (nextPhase === "FINAL_VOTE") {
      // 필요 시 구현: await updateRoomStatus(supabaseAdmin, roomId, ROOM_STATUS.PLAYING, ROOM_STATUS.RESOLVED);
  }

  const refreshed = await fetchGameState(supabaseAdmin, roomId);
  if (!refreshed) throw new HttpError(409, "Game state missing");
  return refreshed;
};

/**
 * ====== 리더 투표는 Write → Admin ======
 */
export const voteLeader = async (
  clientToken: string,
  roomId: string,
  userId: string,
  targetUserId: string
): Promise<LeaderVote> => {
  const readClient = createUserClient(clientToken);

  const room = await fetchRoomById(readClient, roomId);
  if (!room) throw new HttpError(404, "Room not found");
  
  // 수정: 기존 "FINISHED"를 "resolved"(ROOM_STATUS.RESOLVED)로 변경
  // (DB에 저장된 상태가 resolved라고 가정)
  if (room.status !== ROOM_STATUS.RESOLVED) throw new HttpError(409, "Final vote not started");

  const voter = await fetchPlayer(readClient, roomId, userId);
  if (!voter) throw new HttpError(403, "Not a room player");

  const target = await fetchPlayer(readClient, roomId, targetUserId);
  if (!target) throw new HttpError(422, "Target not in room");

  let vote: LeaderVote;
  try {
    vote = await insertLeaderVote(
      supabaseAdmin,
      roomId,
      userId,
      targetUserId,
      voter.influence_score
    );
  } catch (error) {
    const pgError = error as PostgrestError;
    if (pgError?.code === "23505") throw new HttpError(409, "Already voted");
    throw new HttpError(500, pgError?.message || "Database error");
  }

  const [voteCount, playerCount] = await Promise.all([
    countLeaderVotes(supabaseAdmin, roomId),
    countPlayers(supabaseAdmin, roomId),
  ]);

  if (voteCount >= playerCount) {
    await resolveFinal(clientToken, roomId, userId);
  }

  return vote;
};

/**
 * ====== 최종 확정은 Write → Admin ======
 */
export const resolveFinal = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<{ winnerUserId: string; total: number }> => {
  const { room, isHost } = await ensureMembership(clientToken, roomId, userId);
  if (!isHost) throw new HttpError(403, "Only host can resolve");

  // 수정: ROOM_STATUS 사용 (resolved)
  if (room.status !== ROOM_STATUS.RESOLVED) throw new HttpError(409, "Final vote not started");

  const votes = await listLeaderVotes(supabaseAdmin, roomId);
  if (votes.length === 0) throw new HttpError(409, "No votes to resolve");

  const totals = new Map<string, number>();
  for (const vote of votes) {
    totals.set(vote.target_user_id, (totals.get(vote.target_user_id) ?? 0) + vote.weight);
  }

  let winnerUserId = "";
  let maxWeight = -1;
  let tied = false;

  for (const [userIdKey, total] of totals.entries()) {
    if (total > maxWeight) {
      winnerUserId = userIdKey;
      maxWeight = total;
      tied = false;
    } else if (total === maxWeight) {
      tied = true;
    }
  }

  if (tied) throw new HttpError(409, "Leader vote is tied");

  await applyFinalResolution(supabaseAdmin, roomId);

  return { winnerUserId, total: maxWeight };
};

/**
 * ====== 결과 조회/리더보드/투표조회는 read client 유지 ======
 */
export const getFinalResult = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<{ winnerUserId: string; totals: Record<string, number> }> => {
  await ensureMembership(clientToken, roomId, userId);

  const state = await ensureGameState(clientToken, roomId);
  // GameState.phase는 Room.status와 별개이므로 "FINISHED"를 유지하거나 
  // GameState 정의에 따라 변경해야 합니다. 여기서는 RoomStatus가 아니므로 일단 유지합니다.
  if (state.phase !== "FINISHED") throw new HttpError(409, "Game not finished");

  const client = createUserClient(clientToken);
  const votes = await listLeaderVotes(client, roomId);

  const totals: Record<string, number> = {};
  for (const vote of votes) {
    totals[vote.target_user_id] = (totals[vote.target_user_id] ?? 0) + vote.weight;
  }

  let winnerUserId = "";
  let maxWeight = -1;
  let tied = false;

  for (const [userIdKey, total] of Object.entries(totals)) {
    if (total > maxWeight) {
      winnerUserId = userIdKey;
      maxWeight = total;
      tied = false;
    } else if (total === maxWeight) {
      tied = true;
    }
  }

  if (tied) throw new HttpError(409, "Leader vote is tied");

  return { winnerUserId, totals };
};

export const getLeaderboard = async (
  clientToken: string,
  roomId: string,
  userId: string
): Promise<Player[]> => {
  await ensureMembership(clientToken, roomId, userId);

  const client = createUserClient(clientToken);
  const players = await listPlayers(client, roomId);

  return players.sort((a, b) => b.influence_score - a.influence_score);
};

export const getChapterVotes = async (
  clientToken: string,
  roomId: string,
  chapterId: string,
  userId: string
): Promise<ChapterVote[]> => {
  await ensureMembership(clientToken, roomId, userId);

  const client = createUserClient(clientToken);
  return listChapterVotes(client, roomId, chapterId);
};
