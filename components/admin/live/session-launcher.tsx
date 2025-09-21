"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import clsx from "clsx";
import {
  SAMPLE_GAMES,
  createLiveSession,
  type StoredSession,
  loadSessions,
} from "@/lib/game";

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

const ADMIN_LIVE_SESSIONS_KEY = "word-grid-studio:live-session-log";

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

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

export default function LiveSessionLauncher() {
  const [sessions, setSessions] = useState<LiveSessionRecord[]>([]);
  const [playerStats, setPlayerStats] = useState<StoredSession[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>(
    SAMPLE_GAMES[0]?.id ?? "",
  );
  const [hostName, setHostName] = useState("Host");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSessions(loadLiveSessions());
    setPlayerStats(loadSessions());
  }, []);

  const selectedGame = useMemo(
    () => SAMPLE_GAMES.find((game) => game.id === selectedGameId) ?? null,
    [selectedGameId],
  );

  const latestStats = useMemo(() => {
    if (!selectedGame) {
      return null;
    }
    return (
      playerStats.find((session) => session.gameId === selectedGame.id) ?? null
    );
  }, [playerStats, selectedGame]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const createSessionHandler = async () => {
    if (!selectedGame) {
      return;
    }

    try {
      setCreating(true);
      setErrorMessage(null);

      const response = await createLiveSession(selectedGame.id);

      const record: LiveSessionRecord = {
        id: crypto.randomUUID(),
        gameId: selectedGame.id,
        gameTitle: selectedGame.title,
        joinCode: response.code,
        hostToken: response.hostToken,
        hostName: hostName.trim() || "Host",
        createdAt: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      const next = [record, ...sessions].slice(0, 50);
      setSessions(next);
      saveLiveSessions(next);
      setNotes("");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create session",
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
            Spin up a real-time puzzle game just like Kahoot. Share the join
            code or QR code with players, then use the host token to run the
            game from your facilitator view.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create session</h2>
        <p className="mt-1 text-xs text-slate-500">
          Choose a puzzle, name the host, and add any prep notes. Creating a
          session generates a join code and QR code that you can share with
          players.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <label className="flex flex-col text-sm font-medium text-slate-600">
              Puzzle
              <select
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                value={selectedGameId}
                onChange={(event) => setSelectedGameId(event.target.value)}
              >
                {SAMPLE_GAMES.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.title}
                  </option>
                ))}
              </select>
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
                  Run the puzzle once to see local performance insights.
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
              We&apos;ll generate a join code your players can enter, plus a
              host token to authenticate the facilitator app.
            </p>
            {errorMessage && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-600">
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              disabled={creating}
              onClick={createSessionHandler}
              className={clsx(
                "inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
                creating
                  ? "cursor-not-allowed bg-slate-400 text-white"
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
              const joinUrl = `${origin}/play?session=${session.joinCode}`;
              const hostUrl = `${origin}/admin/live?host=${session.hostToken}`;

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
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
