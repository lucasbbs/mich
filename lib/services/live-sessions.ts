import axios from "axios";

const EDGE_BASE_URL =
  (process.env.SUPABASE_EDGE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL ??
    "https://bhqgxqkkwkvgoefpvkse.supabase.co/functions/v1").replace(/\/$/, "");

const LIVE_FUNCTION_NAME =
  process.env.NEXT_PUBLIC_LIVE_FUNCTION_NAME ??
  process.env.LIVE_FUNCTION_NAME ??
  "rapid-task";

const LIVE_SESSION_ROUTE =
  process.env.NEXT_PUBLIC_LIVE_SESSION_ROUTE ??
  process.env.LIVE_SESSION_ROUTE ??
  "session";

const EDGE_TOKEN =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!EDGE_TOKEN && typeof window === "undefined") {
  console.warn("Supabase anon key missing. Live session creation will fail.");
}

type EdgeSessionResponse = {
  code: string;
  gameId: string;
  hostToken: string;
};

const client = axios.create({
  baseURL: `${EDGE_BASE_URL}/${LIVE_FUNCTION_NAME}`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${EDGE_TOKEN}`,
  },
});

export async function createLiveSession(gameId: string): Promise<EdgeSessionResponse> {
  const response = await client.post<EdgeSessionResponse>(`/${LIVE_SESSION_ROUTE}`, {
    gameId,
  });
  return response.data;
}
