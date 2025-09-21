"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  SESSION_STORAGE_EVENT,
  StoredSession,
  clearSessions,
  loadSessions,
} from "@/lib/game";
import { SAMPLE_GAMES } from "@/lib/game";

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

interface SessionRecord extends StoredSession {
  notes?: string;
}

const STORAGE_KEY = "word-grid-studio:admin-sessions";

function loadAdminSessions(): SessionRecord[] {
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
    console.error("Failed to load admin sessions", error);
    return [];
  }
}

function saveAdminSessions(records: SessionRecord[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Failed to persist admin sessions", error);
  }
}

export default function SessionManager() {
  const [recentRuns, setRecentRuns] = useState<StoredSession[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>(
    SAMPLE_GAMES[0]?.id ?? "",
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const refreshPlayerSessions = () => setRecentRuns(loadSessions());
    const refreshAdminSessions = () => setSessions(loadAdminSessions());

    refreshPlayerSessions();
    refreshAdminSessions();

    const handleStorage = () => refreshPlayerSessions();
    const handleCustom: EventListener = () => refreshPlayerSessions();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SESSION_STORAGE_EVENT, handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SESSION_STORAGE_EVENT, handleCustom);
    };
  }, []);

  const lastRunsByGame = useMemo(() => {
    const map = new Map<string, StoredSession>();
    recentRuns.forEach((session) => {
      if (!map.has(session.gameId)) {
        map.set(session.gameId, session);
      }
    });
    return map;
  }, [recentRuns]);

  const selectedGame = useMemo(
    () => SAMPLE_GAMES.find((game) => game.id === selectedGameId) ?? null,
    [selectedGameId],
  );

  const handleCreateRecord = () => {
    if (!selectedGame) {
      return;
    }

    const latestSession = lastRunsByGame.get(selectedGame.id) ?? null;
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      gameId: selectedGame.id,
      gameTitle: selectedGame.title,
      finalScore: latestSession?.finalScore ?? 0,
      correctWords: latestSession?.correctWords ?? 0,
      totalHintsUsed: latestSession?.totalHintsUsed ?? 0,
      completionTimeSeconds: latestSession?.completionTimeSeconds ?? 0,
      playedAt: latestSession?.playedAt ?? new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    const next = [record, ...sessions].slice(0, 100);
    setSessions(next);
    saveAdminSessions(next);
    setNotes("");
  };

  const handleClearAdminSessions = () => {
    setSessions([]);
    saveAdminSessions([]);
  };

  const mergedSessions = useMemo(() => {
    if (!recentRuns.length) {
      return sessions;
    }

    return sessions.map((session) => {
      const match = recentRuns.find((run) => run.playedAt === session.playedAt);
      if (!match) {
        return session;
      }
      return { ...session, ...match };
    });
  }, [sessions, recentRuns]);

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">
            Live session library
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Track hosted real-time puzzle sessions, log outcomes, and keep notes
            for future iterations. Data saved here stays on this admin device.
          </p>
        </div>
        <Link
          href="/play"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
        >
          Jump to player view
        </Link>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Log a new session
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Choose the puzzle you hosted and add any quick notes. If players have
          finished a run, their latest scores will be pre-filled.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <label className="flex flex-col text-sm font-medium text-slate-600">
              Puzzle
              <select
                value={selectedGameId}
                onChange={(event) => setSelectedGameId(event.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
              >
                {SAMPLE_GAMES.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-sm font-medium text-slate-600">
              Notes
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add observations, player feedback, or follow-up tasks."
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <h3 className="text-sm font-semibold text-slate-900">Last run</h3>
            {selectedGame ? (
              (() => {
                const latest = lastRunsByGame.get(selectedGame.id);
                if (!latest) {
                  return (
                    <p className="text-slate-500">
                      No local runs yet. Stats will appear after players finish a
                      puzzle on this device.
                    </p>
                  );
                }
                return (
                  <dl className="space-y-1">
                    <div className="flex items-center justify-between">
                      <dt>Score</dt>
                      <dd className="font-semibold text-slate-900">
                        {latest.finalScore}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Time</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatClock(latest.completionTimeSeconds)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Hints used</dt>
                      <dd className="font-semibold text-slate-900">
                        {latest.totalHintsUsed}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Played</dt>
                      <dd className="font-semibold text-slate-900">
                        {dateFormatter.format(new Date(latest.playedAt))}
                      </dd>
                    </div>
                  </dl>
                );
              })()
            ) : (
              <p className="text-slate-500">Select a puzzle to see recent stats.</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreateRecord}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Save session
          </button>
          <button
            type="button"
            onClick={() => clearSessions()}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
          >
            Clear player stats cache
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Stored sessions
          </h2>
          <button
            type="button"
            onClick={handleClearAdminSessions}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
          >
            Clear archive
          </button>
        </div>

        {mergedSessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-100 p-6 text-center text-sm text-slate-500">
            Save a session to build your archive.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {mergedSessions.map((session) => (
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
                      {dateFormatter.format(new Date(session.playedAt))}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    {session.finalScore} pts
                  </span>
                </div>

                <dl className="mt-4 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <dt>Correct words</dt>
                    <dd className="font-semibold text-slate-900">
                      {session.correctWords}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Total time</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatClock(session.completionTimeSeconds)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Hints used</dt>
                    <dd className="font-semibold text-slate-900">
                      {session.totalHintsUsed}
                    </dd>
                  </div>
                </dl>

                {session.notes && (
                  <p className="mt-3 rounded-2xl bg-slate-100 p-3 text-xs text-slate-600">
                    {session.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
 
