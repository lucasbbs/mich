import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameWord } from "../game/types";
import { createSupabaseClient, supabase } from "./client";

const TABLE_NAME = "games";

export type GameBuilderExport = {
  title?: string;
  rows: number;
  columns: number;
  disabledCells: string[];
  words: Array<Omit<GameWord, "id">>;
};

export interface GameRecord {
  id: number;
  name: string | null;
  games: GameBuilderExport;
  created_at: string;
}

export interface SupabaseOptions {
  sessionToken?: string | null;
}

async function resolveClient(
  options?: SupabaseOptions,
): Promise<SupabaseClient> {
  if (options?.sessionToken) {
    return createSupabaseClient(options.sessionToken);
  }
  return supabase;
}

export async function saveGameConfiguration(
  name: string,
  payload: GameBuilderExport,
  options?: SupabaseOptions,
): Promise<GameRecord> {
  const client = await resolveClient(options);
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Game name is required.");
  }

  const normalizedTitle = payload.title?.trim() || trimmedName;
  const gamesBody: GameBuilderExport = {
    ...payload,
    title: normalizedTitle,
  };

  const { data, error } = await client
    .from(TABLE_NAME)
    .insert({ name: trimmedName, games: gamesBody })
    .select("id, name, games, created_at")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to save game configuration.");
  }

  if (!data) {
    throw new Error("Supabase did not return a game record.");
  }

  return data as GameRecord;
}

export async function listGameConfigurations(
  options?: SupabaseOptions,
): Promise<GameRecord[]> {
  const client = await resolveClient(options);
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("id, name, games, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load game configurations.");
  }

  return (data ?? []) as GameRecord[];
}
