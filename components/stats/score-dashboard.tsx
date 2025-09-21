"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SESSION_STORAGE_EVENT,
  StoredSession,
  clearSessions,
  loadSessions,
} from "@/lib/game";

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

export default function ScoreDashboard() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);

  useEffect(() => {
    const refresh = () => setSessions(loadSessions());

    refresh();

    const handleStorage = () => refresh();
    const handleCustom: EventListener = () => refresh();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SESSION_STORAGE_EVENT, handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SESSION_STORAGE_EVENT, handleCustom);
    };
  }, []);

  const metrics = useMemo(() => {
    if (sessions.length === 0) {
      return null;
    }

    const totals = sessions.reduce(
      (acc, session) => {
        acc.score += session.finalScore;
        acc.time += session.completionTimeSeconds;
        acc.hints += session.totalHintsUsed;
        if (session.finalScore > acc.bestScoreSession.finalScore) {
          acc.bestScoreSession = session;
        }
        if (
          session.completionTimeSeconds <
          acc.bestTimeSession.completionTimeSeconds
        ) {
          acc.bestTimeSession = session;
        }
        return acc;
      },
      {
        score: 0,
        time: 0,
        hints: 0,
        bestScoreSession: sessions[0],
        bestTimeSession: sessions[0],
      },
    );

    const totalGames = sessions.length;
    return {
      totalGames,
      averageScore: Math.round(totals.score / totalGames),
      averageTimeSeconds: totals.time / totalGames,
      averageHints: totals.hints / totalGames,
      bestScoreSession: totals.bestScoreSession,
      bestTimeSession: totals.bestTimeSession,
    };
  }, [sessions]);

  const recentSessions = useMemo(() => sessions.slice(0, 10), [sessions]);

  const handleClearHistory = () => {
    clearSessions();
    setSessions([]);
  };

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold text-slate-900">
          Scoreboard
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Review your recent runs, track average performance, and spot your
          personal bests across puzzles.
        </p>
      </header>

      {metrics ? (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <dt>Total games</dt>
                <dd className="font-semibold text-slate-900">
                  {metrics.totalGames}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Average score</dt>
                <dd className="font-semibold text-slate-900">
                  {metrics.averageScore}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Average time</dt>
                <dd className="font-semibold text-slate-900">
                  {formatClock(metrics.averageTimeSeconds)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Average hints</dt>
                <dd className="font-semibold text-slate-900">
                  {metrics.averageHints.toFixed(1)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Best score
              </h3>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {metrics.bestScoreSession.finalScore}
              </p>
              <p className="text-xs text-slate-500">
                {metrics.bestScoreSession.gameTitle} · {dateFormatter.format(
                  new Date(metrics.bestScoreSession.playedAt),
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Fastest completion
              </h3>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {formatClock(metrics.bestTimeSession.completionTimeSeconds)}
              </p>
              <p className="text-xs text-slate-500">
                {metrics.bestTimeSession.gameTitle} · {dateFormatter.format(
                  new Date(metrics.bestTimeSession.playedAt),
                )}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-100 p-6 text-center text-sm text-slate-500">
          Play a puzzle to start building your stats.
        </section>
      )}

      {sessions.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent sessions
            </h2>
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
            >
              Clear history
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Puzzle</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Hints</th>
                  <th className="px-4 py-3">Solved</th>
                  <th className="px-4 py-3">Played</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSessions.map((session) => (
                  <tr key={session.id} className="text-slate-700">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {session.gameTitle}
                    </td>
                    <td className="px-4 py-3">{session.finalScore}</td>
                    <td className="px-4 py-3">
                      {formatClock(session.completionTimeSeconds)}
                    </td>
                    <td className="px-4 py-3">{session.totalHintsUsed}</td>
                    <td className="px-4 py-3">{session.correctWords}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {dateFormatter.format(new Date(session.playedAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
