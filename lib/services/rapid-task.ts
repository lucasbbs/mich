import axios from "axios";

export interface RapidTaskPayload extends Record<string, unknown> {
  name: string;
}

export interface RapidTaskOptions {
  path?: string;
  token?: string;
}

export interface RapidTaskResponse<T = unknown> {
  data: T | null;
  error?: string;
  status: number;
}

const EDGE_BASE_URL = (
  process.env.SUPABASE_EDGE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL ??
  "https://bhqgxqkkwkvgoefpvkse.supabase.co/functions/v1"
).replace(/\/$/, "");

const FUNCTION_NAME =
  process.env.NEXT_PUBLIC_RAPID_TASK_FUNCTION_NAME ??
  process.env.RAPID_TASK_FUNCTION_NAME ??
  "rapid-task";

const DEFAULT_TOKEN =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!DEFAULT_TOKEN && typeof window === "undefined") {
  console.warn("Supabase anon key missing. Rapid task requests will fail.");
}

const baseClient = axios.create({
  baseURL: `${EDGE_BASE_URL}/${FUNCTION_NAME}`,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function callRapidTask<T = unknown>(
  payload: RapidTaskPayload,
  options: RapidTaskOptions = {},
): Promise<RapidTaskResponse<T>> {
  const token = options.token ?? DEFAULT_TOKEN;
  const path = options.path ? `/${options.path.replace(/^\//, "")}` : "";

  try {
    const response = await baseClient.post<T>(path || "/", payload, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const responseData = error.response?.data ?? null;
      const message =
        (responseData && typeof responseData === "object" && "error" in responseData
          ? String((responseData as { error?: string }).error ?? "")
          : undefined) ?? error.message;

      return {
        data: responseData as T | null,
        error: message,
        status,
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
      status: 500,
    };
  }
}
