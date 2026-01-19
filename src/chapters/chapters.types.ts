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
  