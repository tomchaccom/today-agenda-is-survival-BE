// src/chapters/chapters.types.ts
export type VoteChoice = "A" | "B";

export type ChapterRow = {
  id: string;
  room_id: string;
  order: number;
  title: string;
  description: string;
  option_a_label: string;
  option_b_label: string;
};

export type ChapterVoteRow = {
  id: string;
  room_id: string;
  chapter_id: string;
  user_id: string;
  choice: VoteChoice;
};

export type LeaderVoteRow = {
  id: string;
  room_id: string;
  voter_user_id: string;
  choice: VoteChoice;
  weight: number;
  created_at: string;
};

export type RoomRow = {
  id: string;
  status: string;
  current_qnum: number;
};

export type PlayerRow = {
  room_id: string;
  user_id: string;
  nickname: string | null;
  score: number;
  joined_at: string;
};
