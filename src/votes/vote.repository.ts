import { supabase } from "../supabase/supabase.client";

export type Vote = {
  id: string;
  room_id: string;
  question_id: string;
  user_id: string;
  decision: boolean;
  created_at: string;
};

export type Question = {
  id: string;
  room_id: string;
  qnum: number;
};

export type RoomResult = {
  room_id: string;
  user_id: string;
  score: number;
};

export const fetchQuestion = async (
  roomId: string,
  questionId: string
): Promise<Question | null> => {
  const { data, error } = await supabase
    .from("questions")
    .select("id,room_id,qnum")
    .eq("room_id", roomId)
    .eq("id", questionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const countQuestions = async (
  roomId: string
): Promise<number> => {
  const { count, error } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (error) {
    throw error;
  }

  return count ?? 0;
};

export const insertVote = async (
  roomId: string,
  questionId: string,
  userId: string,
  decision: boolean
): Promise<Vote> => {
  const { data, error } = await supabase
    .from("votes")
    .insert({
      room_id: roomId,
      question_id: questionId,
      user_id: userId,
      decision,
    })
    .select("id,room_id,question_id,user_id,decision,created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const countVotesForQuestion = async (
  roomId: string,
  questionId: string
): Promise<number> => {
  const { count, error } = await supabase
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("question_id", questionId);

  if (error) {
    throw error;
  }

  return count ?? 0;
};

export const listVotesForQuestion = async (
  roomId: string,
  questionId: string
): Promise<Vote[]> => {
  const { data, error } = await supabase
    .from("votes")
    .select("id,room_id,question_id,user_id,decision,created_at")
    .eq("room_id", roomId)
    .eq("question_id", questionId);

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const listVotesForRoom = async (
  roomId: string
): Promise<Vote[]> => {
  const { data, error } = await supabase
    .from("votes")
    .select("id,room_id,question_id,user_id,decision,created_at")
    .eq("room_id", roomId);

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const insertRoomResults = async (
  results: RoomResult[]
): Promise<void> => {
  if (!results.length) {
    return;
  }

  const { error } = await supabase
    .from("room_results")
    .insert(results);

  if (error) {
    throw error;
  }
};
