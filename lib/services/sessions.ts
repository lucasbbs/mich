import { getSupabaseClient } from "./supabase-client";

const TABLE_NAME = "sessions";

export interface SessionRecord {
  id: number;
  session_id: string | null;
  game_id: number | null;
  created_at: string;
}

export interface SaveSessionRecordInput {
  sessionId: string;
  gameId?: number | null;
}

export async function saveSessionRecord(
  payload: SaveSessionRecordInput,
): Promise<SessionRecord> {
  const client = getSupabaseClient();
  const { sessionId, gameId = null } = payload;

  const { data, error } = await client
    .from(TABLE_NAME)
    .insert({
      session_id: sessionId,
      game_id: gameId,
    })
    .select("id, session_id, game_id, created_at")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to save session record.");
  }

  if (!data) {
    throw new Error("Supabase did not return a session record.");
  }

  return data as SessionRecord;
}
