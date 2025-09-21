const STORAGE_KEY = "word-grid-studio:sessions";
const STORAGE_EVENT = "word-grid-studio:sessions-updated";

export interface StoredSession {
  id: string;
  gameId: string;
  gameTitle: string;
  finalScore: number;
  correctWords: number;
  totalHintsUsed: number;
  completionTimeSeconds: number;
  playedAt: string; // ISO timestamp
}

export function loadSessions(): StoredSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load sessions", error);
    return [];
  }
}

function emitUpdate() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function saveSession(record: StoredSession) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const existing = loadSessions();
    const next = [record, ...existing].slice(0, 200);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitUpdate();
  } catch (error) {
    console.error("Failed to persist session", error);
  }
}

export function clearSessions() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    emitUpdate();
  } catch (error) {
    console.error("Failed to clear sessions", error);
  }
}

export const SESSION_STORAGE_EVENT = STORAGE_EVENT;
