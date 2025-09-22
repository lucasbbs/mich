"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

interface SessionPlayer {
  id: string;
  name: string;
  score: number;
  hintsUsed: number;
  totalTimeMs: number;
  joinedAt: number;
}

interface SessionState {
  code: string;
  status: "lobby" | "active" | "finished";
  currentWordId: string | null;
  gameId: string;
  createdAt: number;
  players: SessionPlayer[];
}

interface SessionWelcomePayload {
  playerId: string;
  session: SessionState;
}

interface SessionClosedPayload {
  reason?: string;
}

const EDGE_HTTP_BASE = (
  process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL ??
  "https://bhqgxqkkwkvgoefpvkse.supabase.co/functions/v1"
).replace(/\/$/, "");

const FUNCTION_NAME =
  process.env.NEXT_PUBLIC_LIVE_FUNCTION_NAME ?? "rapid-task";

const EDGE_WS_BASE = EDGE_HTTP_BASE.replace(/^http/, "ws");

function leaderboard(players: SessionPlayer[]) {
  return [...players].sort(
    (a, b) => b.score - a.score || a.hintsUsed - b.hintsUsed,
  );
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

export default function LiveJoinClient() {
  const searchParams = useSearchParams();
  const initialSession = (searchParams.get("session") ?? "").trim();

  const [joinCode, setJoinCode] = useState(initialSession);
  const [playerName, setPlayerName] = useState("");
  const [phase, setPhase] = useState<
    "form" | "connecting" | "connected" | "closed" | "error"
  >("form");
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const joinDisabled =
    phase === "connecting" ||
    joinCode.trim().length === 0 ||
    playerName.trim().length === 0;

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (joinDisabled) {
      return;
    }

    const code = joinCode.trim().toUpperCase();
    const name = playerName.trim();

    try {
      socketRef.current?.close();
    } catch {}

    setPhase("connecting");
    setErrorMessage(null);
    setSessionState(null);
    setPlayerId(null);

    const wsUrl = `${EDGE_WS_BASE}/${FUNCTION_NAME}?role=player&code=${encodeURIComponent(
      code,
    )}&name=${encodeURIComponent(name)}`;

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setPhase("connected");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data?.type === "session_state") {
            setSessionState(data.payload as SessionState);
          } else if (data?.type === "session_welcome") {
            const payload = data.payload as SessionWelcomePayload;
            setPlayerId(payload.playerId);
            setSessionState(payload.session);
          } else if (data?.type === "session_closed") {
            const payload = data.payload as SessionClosedPayload;
            setErrorMessage(payload.reason ?? "Session closed by host");
            setPhase("closed");
            socket.close();
          }
        } catch (error) {
          console.error("Failed to parse message", error);
        }
      };

      socket.onerror = (event) => {
        console.error("WebSocket error", event);
        setErrorMessage("Connection error. Please try again.");
        setPhase("error");
      };

      socket.onclose = () => {
        if (phase !== "closed" && phase !== "error") {
          setPhase("closed");
        }
      };
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to connect to live session.");
      setPhase("error");
    }
  };

  const summary = useMemo(() => {
    if (!sessionState) {
      return null;
    }
    const players = leaderboard(sessionState.players);
    const winner = players[0];
    return { players, winner };
  }, [sessionState]);

  if (!sessionState || phase === "connecting") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-3xl font-semibold text-slate-900">
              Join live session
            </h1>
            <p className="text-sm text-slate-600">
              Enter the join code and choose a display name to enter the lobby.
            </p>
          </div>

          <label className="flex flex-col text-sm font-medium text-slate-600">
            Join code
            <input
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold uppercase tracking-[0.3em] text-slate-900 focus:border-slate-500 focus:outline-none"
              value={joinCode}
              onChange={(event) =>
                setJoinCode(event.target.value.toUpperCase())
              }
              placeholder="ABC123"
              maxLength={6}
            />
          </label>

          <label className="flex flex-col text-sm font-medium text-slate-600">
            Your name
            <input
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-500 focus:outline-none"
              value={playerName}
              onChange={(event) => setPlayerName(event.target.value)}
              placeholder="e.g. Trivia Titan"
            />
          </label>

          <button
            type="submit"
            disabled={joinDisabled}
            className={clsx(
              "inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
              joinDisabled
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-slate-900 text-white hover:bg-slate-700",
            )}
          >
            {phase === "connecting" ? "Joining..." : "Join session"}
          </button>

          {errorMessage && (
            <p className="text-center text-sm text-rose-600">{errorMessage}</p>
          )}
        </form>
      </main>
    );
  }

  if (phase === "closed" || phase === "error") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12 text-center">
        <h1 className="font-display text-3xl font-semibold text-slate-900">
          Connection closed
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {errorMessage ?? "The session ended or you were disconnected."}
        </p>
        <button
          type="button"
          onClick={() => {
            setPhase("form");
            setSessionState(null);
            setErrorMessage(null);
          }}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Join another session
        </button>
      </main>
    );
  }

  if (sessionState.status === "lobby") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-10 px-6 py-12">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Waiting for host
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-slate-900">
            You&apos;re in! {playerName.trim() || "Player"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Waiting for {sessionState.code} to start. Hang tight!
          </p>
        </div>

        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Lobby
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {sessionState.players.map((player) => (
              <li
                key={player.id}
                className={clsx(
                  "rounded-xl border px-4 py-3 text-sm font-semibold",
                  player.id === playerId
                    ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-slate-50 text-slate-700",
                )}
              >
                {player.name}
              </li>
            ))}
            {sessionState.players.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Waiting for others to join...
              </li>
            )}
          </ul>
        </div>
      </main>
    );
  }

  if (sessionState.status === "active") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-10 px-6 py-12 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Game on
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-slate-900">
            Good luck, {playerName.trim() || "Player"}!
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Watch the host screen for questions. Your score will update here
            when the host awards points.
          </p>
        </div>

        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Live scoreboard
          </h2>
          <ul className="mt-4 space-y-2 text-left text-sm">
            {summary?.players.map((player, index) => (
              <li
                key={player.id}
                className={clsx(
                  "flex items-center justify-between rounded-xl border px-4 py-3",
                  player.id === playerId
                    ? "border-indigo-300 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-slate-50 text-slate-700",
                )}
              >
                <span>
                  <span className="mr-2 text-xs font-semibold uppercase text-slate-500">
                    #{index + 1}
                  </span>
                  {player.name}
                </span>
                <span className="font-semibold text-slate-900">
                  {player.score} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Final standings
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-slate-900">
          {summary?.winner
            ? `${summary.winner.name} wins with ${summary.winner.score} pts!`
            : "Game finished"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Thanks for playing. Feel free to join another session when you&apos;re
          ready.
        </p>
      </div>

      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Leaderboard
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {summary?.players.map((player, index) => (
            <li
              key={player.id}
              className={clsx(
                "flex items-center justify-between rounded-xl border px-4 py-3",
                player.id === playerId
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">
                  #{index + 1} {player.name}
                </span>
                <span className="text-xs text-slate-500">
                  {player.hintsUsed} hints •{" "}
                  {formatClock(player.totalTimeMs / 1000)}
                </span>
              </div>
              <span className="text-base font-semibold text-slate-900">
                {player.score} pts
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => {
          setPhase("form");
          setSessionState(null);
          setErrorMessage(null);
          setPlayerName("");
          setJoinCode(initialSession);
        }}
        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
      >
        Join another game
      </button>
    </main>
  );
}


