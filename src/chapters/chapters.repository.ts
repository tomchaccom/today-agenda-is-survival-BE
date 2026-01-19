import { SupabaseClient } from "@supabase/supabase-js";

export const getCurrentQuestion = async (
  client: SupabaseClient,
  roomId: string
) => {
  const { data, error } = await client
    .from("rooms")
    .select(`
      questions (
        id,
        chapter,
        qnum,
        is_final,
        content
      )
    `)
    .eq("id", roomId)
    .single();

  if (error) throw error;
  return data?.questions;
};
