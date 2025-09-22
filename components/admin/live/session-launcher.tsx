"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import clsx from "clsx";
import {
  createLiveSession,
  listGameConfigurations,
  loadSessions,
  saveSessionRecord,
} from "@/lib/game";
import type { GameRecord, StoredSession } from "@/lib/game";

interface LiveSessionRecord {
  id: string;
  gameId: string;
  gameTitle: string;
  joinCode: string;
  hostToken: string;
  hostName: string;
  createdAt: string;
  notes?: string;
}

interface SessionState {
  code: string;
  status: "lobby" | "active" | "finished";
  currentWordId: string | null;
  gameId: string;
  createdAt: number;
  players: SessionPlayer[];
}

interface SessionPlayer {
  id: string;
  name: string;
  score: number;
  hintsUsed: number;
  totalTimeMs: number;
  joinedAt: number;
}

interface SessionClosedPayload {
  reason?: string;
}

const ADMIN_LIVE_SESSIONS_KEY = "word-grid-studio:live-session-log";

const EDGE_HTTP_BASE = (
  process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL ??
  "https://bhqgxqkkwkvgoefpvkse.supabase.co/functions/v1"
).replace(/\/$/, "");

const FUNCTION_NAME = process.env.NEXT_PUBLIC_LIVE_FUNCTION_NAME ?? "";

const EDGE_WS_BASE = EDGE_HTTP_BASE.replace(/^http/, "ws");

function deriveGameTitle(record: GameRecord): string {
  const explicitName =
    typeof record.name === "string" ? record.name.trim() : "";
  if (explicitName) {
    return explicitName;
  }

  const title = record.games?.title;
  if (typeof title === "string" && title.trim()) {
    return title.trim();
  }

  return `Game #${record.id}`;
}

function loadLiveSessions(): LiveSessionRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(ADMIN_LIVE_SESSIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load live sessions", error);
    return [];
  }
}

function saveLiveSessions(records: LiveSessionRecord[]) {
  try {
    window.localStorage.setItem(
      ADMIN_LIVE_SESSIONS_KEY,
      JSON.stringify(records),
    );
  } catch (error) {
    console.error("Failed to persist live sessions", error);
  }
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

function leaderboard(players: SessionPlayer[]) {
  return [...players].sort(
    (a, b) => b.score - a.score || a.hintsUsed - b.hintsUsed,
  );
}

function HostConsole({
  record,
  initiallyOpen,
}: {
  record: LiveSessionRecord;
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "closed"
  >(initiallyOpen ? "connecting" : "idle");
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!open) {
      socketRef.current?.close();
      return;
    }

    const wsUrl = `${EDGE_WS_BASE}/${FUNCTION_NAME}?role=host&code=${encodeURIComponent(
      record.joinCode,
    )}&token=${encodeURIComponent(record.hostToken)}&name=${encodeURIComponent(
      record.hostName,
    )}`;

    setConnectionState("connecting");
    setErrorMessage(null);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionState("connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data?.type === "session_state") {
          setSessionState(data.payload as SessionState);
        } else if (data?.type === "session_closed") {
          const payload = data.payload as SessionClosedPayload;
          setErrorMessage(payload.reason ?? "Session closed");
          setConnectionState("closed");
          socket.close();
        }
      } catch (error) {
        console.error("Failed to parse host message", error);
      }
    };

    socket.onerror = (event) => {
      console.error("Host socket error", event);
      setErrorMessage("Connection error");
      setConnectionState("closed");
    };

    socket.onclose = () => {
      setConnectionState("closed");
    };

    return () => {
      socket.close();
    };
  }, [open, record.hostName, record.hostToken, record.joinCode]);

  const sendMessage = (payload: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  };

  const players = leaderboard(sessionState?.players ?? []);

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Host console</h3>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              Status:
              <span className="ml-1 font-semibold text-slate-800">
                {connectionState === "connected" && sessionState
                  ? sessionState.status === "lobby"
                    ? "Lobby"
                    : sessionState.status === "active"
                    ? "Active"
                    : "Finished"
                  : connectionState === "connecting"
                  ? "Connecting"
                  : "Disconnected"}
              </span>
            </span>
            <span>Players: {sessionState?.players.length ?? 0}</span>
            {sessionState && (
              <span>
                Created: {new Date(sessionState.createdAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {errorMessage && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                connectionState !== "connected" ||
                sessionState?.status !== "lobby"
              }
              onClick={() => sendMessage({ type: "start_game" })}
              className={clsx(
                "inline-flex rounded-full px-4 py-1.5 text-xs font-semibold transition",
                connectionState === "connected" &&
                  sessionState?.status === "lobby"
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "cursor-not-allowed bg-slate-200 text-slate-500",
              )}
            >
              Start game
            </button>
            <button
              type="button"
              disabled={
                connectionState !== "connected" ||
                sessionState?.status !== "active"
              }
              onClick={() => sendMessage({ type: "end_game" })}
              className={clsx(
                "inline-flex rounded-full px-4 py-1.5 text-xs font-semibold transition",
                connectionState === "connected" &&
                  sessionState?.status === "active"
                  ? "bg-rose-600 text-white hover:bg-rose-500"
                  : "cursor-not-allowed bg-slate-200 text-slate-500",
              )}
            >
              End game
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Players
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              {players.length === 0 && (
                <li className="text-slate-500">No players yet</li>
              )}
              {players.map((player, index) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2"
                >
                  <span>
                    <span className="mr-2 font-semibold text-slate-400">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {player.name}
                    </span>
                  </span>
                  <span className="font-semibold text-slate-900">
                    {player.score} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function LiveSessionLauncher() {
  const [sessions, setSessions] = useState<LiveSessionRecord[]>([]);
  const [playerStats, setPlayerStats] = useState<StoredSession[]>([]);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [hostName, setHostName] = useState("Host");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("host");

  useEffect(() => {
    setSessions(loadLiveSessions());
    setPlayerStats(loadSessions());
  }, []);

  useEffect(() => {
    let active = true;

    const fetchGames = async () => {
      try {
        setGamesLoading(true);
        setGamesError(null);
        const data = await listGameConfigurations();
        if (!active) {
          return;
        }
        setGames(data);
      } catch (error) {
        if (!active) {
          return;
        }
        console.error("Failed to load game configurations", error);
        setGames([]);
        setGamesError(
          error instanceof Error
            ? error.message
            : "Failed to load games from Supabase.",
        );
      } finally {
        if (active) {
          setGamesLoading(false);
        }
      }
    };

    fetchGames();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedGameId && games.length > 0) {
      setSelectedGameId(String(games[0].id));
    }
  }, [games, selectedGameId]);

  const selectedGame = useMemo(() => {
    if (!selectedGameId) {
      return null;
    }

    const numericId = Number(selectedGameId);
    if (Number.isNaN(numericId)) {
      return null;
    }

    return games.find((game) => game.id === numericId) ?? null;
  }, [games, selectedGameId]);

  const latestStats = useMemo(() => {
    if (!selectedGame) {
      return null;
    }
    return (
      playerStats.find(
        (session) => session.gameId === String(selectedGame.id),
      ) ?? null
    );
  }, [playerStats, selectedGame]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const createSessionHandler = async () => {
    if (!selectedGame) {
      setErrorMessage("Select a puzzle before creating a session.");
      return;
    }

    try {
      setCreating(true);
      setErrorMessage(null);
      const response = await createLiveSession(String(selectedGame.id));

      let persistenceError: string | null = null;
      try {
        await saveSessionRecord({
          sessionId: response.code,
          gameId: selectedGame.id,
        });
      } catch (supabaseError) {
        console.error("Failed to save session record", supabaseError);
        persistenceError =
          supabaseError instanceof Error
            ? supabaseError.message
            : "Session created, but failed to persist in Supabase.";
      }

      const gameTitle = deriveGameTitle(selectedGame);

      const record: LiveSessionRecord = {
        id: crypto.randomUUID(),
        gameId: String(selectedGame.id),
        gameTitle,
        joinCode: response.code.toUpperCase(),
        hostToken: response.hostToken,
        hostName: hostName.trim() || "Host",
        createdAt: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      const next = [record, ...sessions].slice(0, 50);
      setSessions(next);
      saveLiveSessions(next);
      setNotes("");

      if (persistenceError) {
        setErrorMessage(persistenceError);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create live session",
      );
    } finally {
      setCreating(false);
    }
  };

  const clearSessions = () => {
    setSessions([]);
    saveLiveSessions([]);
  };

  const copyToClipboard = async (value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Launch a live session
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Create and manage real-time puzzle sessions. Share the join code or
            QR code with players, then control the flow from the host console.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create session</h2>
        <p className="mt-1 text-xs text-slate-500">
          Choose a puzzle, set a host name, and optionally add prep notes.
          We&apos;ll generate join details for players and a host token for you.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <label className="flex flex-col text-sm font-medium text-slate-600">
              Puzzle
              <select
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                value={selectedGameId}
                onChange={(event) => setSelectedGameId(event.target.value)}
                disabled={gamesLoading || games.length === 0}
              >
                {gamesLoading ? (
                  <option value="">Loading games…</option>
                ) : games.length > 0 ? (
                  games.map((game) => (
                    <option key={game.id} value={String(game.id)}>
                      {deriveGameTitle(game)}
                    </option>
                  ))
                ) : (
                  <option value="">No saved games found</option>
                )}
              </select>
              {gamesError ? (
                <span className="mt-2 text-xs text-rose-600">{gamesError}</span>
              ) : null}
              {!gamesLoading && !gamesError && games.length === 0 ? (
                <span className="mt-2 text-xs text-slate-500">
                  Save a game in the builder to launch a live session.
                </span>
              ) : null}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col text-sm font-medium text-slate-600">
                Host name
                <input
                  type="text"
                  value={hostName}
                  onChange={(event) => setHostName(event.target.value)}
                  placeholder="Host"
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                />
              </label>
              {latestStats ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Last score</span>
                    <span className="font-semibold text-slate-900">
                      {latestStats.finalScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time</span>
                    <span className="font-semibold text-slate-900">
                      {formatClock(latestStats.completionTimeSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Hints</span>
                    <span className="font-semibold text-slate-900">
                      {latestStats.totalHintsUsed}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  Run the puzzle once to see recent performance stats.
                </div>
              )}
            </div>

            <label className="flex flex-col text-sm font-medium text-slate-600">
              Notes
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Agenda, focus points, or reminders for this session."
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p>
              We&apos;ll generate a join code and QR code for players, and a
              host token for you to control the session.
            </p>
            {errorMessage && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-600">
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              disabled={creating || !selectedGame}
              onClick={createSessionHandler}
              className={clsx(
                "inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
                creating
                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                  : "bg-slate-900 text-white hover:bg-slate-700",
              )}
            >
              {creating ? "Creating..." : "Create live session"}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent live sessions
          </h2>
          <button
            type="button"
            onClick={clearSessions}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
          >
            Clear log
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-100 p-6 text-center text-sm text-slate-500">
            You haven&apos;t launched a live session yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sessions.map((session) => {
              const joinUrl = `${origin}/live?session=${session.joinCode}`;
              const hostUrl = `${origin}/admin/live?host=${session.hostToken}`;
              const initiallyOpen = tokenParam === session.hostToken;

              return (
                <div
                  key={session.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {session.gameTitle}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {new Date(session.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Host:{" "}
                        <span className="font-semibold text-slate-800">
                          {session.hostName}
                        </span>
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                      Code {session.joinCode}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,120px)]">
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <span>Host token</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(session.hostToken)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="mt-1 break-all font-mono text-slate-900">
                          {session.hostToken}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <span>Player link</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(joinUrl)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="mt-1 break-all font-mono text-slate-900">
                          {joinUrl}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                          <span>Host link</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(hostUrl)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="mt-1 break-all font-mono text-slate-900">
                          {hostUrl}
                        </p>
                      </div>

                      {session.notes && (
                        <p className="rounded-xl bg-slate-100 p-3 text-slate-600">
                          {session.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center gap-2">
                      <QRCodeCanvas value={joinUrl} size={120} includeMargin />
                      <span className="text-[11px] text-slate-500">
                        Scan to join
                      </span>
                    </div>
                  </div>

                  <HostConsole record={session} initiallyOpen={initiallyOpen} />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

