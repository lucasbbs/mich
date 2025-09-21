import axios from "axios";

export interface RapidTaskPayload {
  name: string;
}

interface RapidTaskResponse {
  data: unknown;
  error?: string;
}

const EDGE_BASE_URL =
  process.env.SUPABASE_EDGE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL ??
  "https://bhqgxqkkwkvgoefpvkse.supabase.co/functions/v1";

const EDGE_TOKEN =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!EDGE_TOKEN && typeof window === "undefined") {
  console.warn("Supabase anon key missing. Calls to rapid-task will fail.");
}

const client = axios.create({
  baseURL: EDGE_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${EDGE_TOKEN}`,
  },
});

export async function callRapidTask(
  payload: RapidTaskPayload,
): Promise<RapidTaskResponse> {
  try {
    const response = await client.post("/rapid-task", payload);
    return { data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data ?? null;
      const message =
        (typeof responseData === "object" && responseData && "error" in responseData
          ? (responseData as { error?: string }).error
          : undefined) ?? error.response?.statusText ?? error.message;

      return {
        data: responseData,
        error: message,
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
