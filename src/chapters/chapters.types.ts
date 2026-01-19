// src/chapters/chapters.types.ts



export type QuestionRow = {
    id: number;
    chapter: number;
    qnum: number;
    is_final: boolean;
    content: string;
  };
  
  export type VoteChoice = "A" | "B";
  
  export type ChapterResolveResult = {
    roomId: string;
    chapter: number;
    qnum: number;
    majority: VoteChoice;
    isFinal: boolean;
  };
  

  export type VoteDecision = "A" | "B";
  
  export type RoomRow = {
    id: string;
    status: string;
    capacity: number;
    current_qnum: number;
  };
  
  export type PlayerRow = {
    room_id: string;
    user_id: string;
    nickname: string | null;
    score: number;
    joined_at: string;
  };