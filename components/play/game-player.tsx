"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import type { GameWord } from "@/lib/game";
import { SAMPLE_GAMES, buildLetterMap, toCellKey } from "@/lib/game";

interface WordProgress extends GameWord {
  revealedHints: number;
  guess: string;
  completed: boolean;
}

interface ScoreSummary {
  correctWords: number;
  totalHintsUsed: number;
  completionTimeSeconds: number;
  finalScore: number;
}

const SCORE_WORD_BASE = 10;
const HINT_PENALTY = 2;
const TIME_DECAY = 0.05; // points lost per second

function computeScore(
  words: WordProgress[],
  elapsedSeconds: number,
): ScoreSummary {
  const correctWords = words.filter((word) => word.completed).length;
  const totalHintsUsed = words.reduce(
    (sum, word) => sum + (word.completed ? word.revealedHints : 0),
    0,
  );

  const baseScore = correctWords * SCORE_WORD_BASE;
  const hintPenalty = totalHintsUsed * HINT_PENALTY;
  const timePenalty = Math.floor(elapsedSeconds * TIME_DECAY);

  const finalScore = Math.max(0, baseScore - hintPenalty - timePenalty);

  return {
    correctWords,
    totalHintsUsed,
    completionTimeSeconds: Math.floor(elapsedSeconds),
    finalScore,
  };
}

function initialiseWords(words: GameWord[]): WordProgress[] {
  return words.map((word) => ({
    ...word,
    revealedHints: 0,
    guess: "",
    completed: false,
  }));
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

export default function GamePlayer() {
  const [selectedGameId, setSelectedGameId] = useState<string>(
    SAMPLE_GAMES[0]?.id ?? "",
  );
  const [words, setWords] = useState<WordProgress[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<ScoreSummary | null>(null);

  const game = useMemo(
    () =>
      SAMPLE_GAMES.find((candidate) => candidate.id === selectedGameId) ?? null,
    [selectedGameId],
  );

  useEffect(() => {
    if (!game) {
      setWords([]);
      setSummary(null);
      setElapsed(0);
      setStartTime(null);
      setFrozen(false);
      return;
    }

    setWords(initialiseWords(game.words));
    setSummary(null);
    setElapsed(0);
    setStartTime(Date.now());
    setFrozen(false);
  }, [game]);

  useEffect(() => {
    if (frozen || !startTime) {
      return;
    }

    const tick = window.setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 500);

    return () => window.clearInterval(tick);
  }, [frozen, startTime]);

  useEffect(() => {
    if (!words.length) {
      return;
    }

    const allDone = words.every((word) => word.completed);
    if (allDone && !frozen && startTime) {
      const now = Date.now();
      const totalSeconds = (now - startTime) / 1000;
      const score = computeScore(words, totalSeconds);

      setSummary(score);
      setFrozen(true);
      setElapsed(totalSeconds);
    }
  }, [words, frozen, startTime]);

  const letterMap = useMemo(
    () => buildLetterMap(words.filter((word) => word.completed)),
    [words],
  );
  const disabledCells = useMemo(() => new Set(game?.disabledCells ?? []), [game]);
  const solvedCount = useMemo(
    () => words.filter((word) => word.completed).length,
    [words],
  );

  const handleGuessChange = (id: string, value: string) => {
    setWords((previous) =>
      previous.map((word) => {
        if (word.id !== id) {
          return word;
        }
        return {
          ...word,
          guess: value.toUpperCase(),
        };
      }),
    );
  };

  const handleSubmitGuess = (word: WordProgress) => {
    const candidate = word.guess.replace(/\s+/g, "").toUpperCase();

    setWords((previous) =>
      previous.map((item) => {
        if (item.id !== word.id) {
          return item;
        }
        if (candidate === item.answer) {
          return {
            ...item,
            completed: true,
            guess: item.answer,
          };
        }

        return {
          ...item,
          completed: false,
        };
      }),
    );
  };

  const handleRevealHint = (word: WordProgress) => {
    setWords((previous) =>
      previous.map((item) => {
        if (item.id !== word.id) {
          return item;
        }
        if (item.revealedHints >= item.hints.length) {
          return item;
        }

        return {
          ...item,
          revealedHints: item.revealedHints + 1,
        };
      }),
    );
  };

  const handleRestart = () => {
    if (!game) {
      return;
    }
    setWords(initialiseWords(game.words));
    setSummary(null);
    setFrozen(false);
    setElapsed(0);
    setStartTime(Date.now());
  };

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold text-slate-900">
          Play puzzle
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Choose a puzzle, reveal hints as needed, and lock in each word. Your
          score is calculated from solved words, minus hint penalties and
          elapsed time.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Select puzzle
            </span>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {game?.title ?? "Choose a saved puzzle"}
            </p>
          </div>
          <select
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 focus:border-slate-500 focus:outline-none"
            value={selectedGameId}
            onChange={(event) => setSelectedGameId(event.target.value)}
          >
            {SAMPLE_GAMES.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
            {game ? `${game.rows} × ${game.columns}` : "–"} grid
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
            {solvedCount} / {words.length} solved
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
            Time {formatClock(elapsed)}
          </span>
          {summary && (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              Final score {summary.finalScore}
            </span>
          )}
        </div>
      </section>

      {game ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Board</h2>
            <p className="mt-1 text-xs text-slate-500">
              Numbers mark each clue's starting cell. Solved answers lock their
              letters in place.
            </p>

            <div className="mt-6 overflow-x-auto">
              <div
                className="mx-auto grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${game.columns}, minmax(0, 1fr))`,
                  maxWidth: "min(100%, 600px)",
                }}
              >
                {Array.from({ length: game.rows }).map((_, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="contents">
                    {Array.from({ length: game.columns }).map((__, columnIndex) => {
                      const row = rowIndex + 1;
                      const col = columnIndex + 1;
                      const key = toCellKey(row, col);
                      const disabled = disabledCells.has(key);
                      const letter = letterMap[key] ?? "";

                      const numbers = words
                        .filter(
                          (word) =>
                            word.start.row === row && word.start.col === col,
                        )
                        .map((word) => word.number)
                        .sort((a, b) => a - b);

                      return (
                        <div
                          key={key}
                          className={clsx(
                            "relative aspect-square select-none rounded-md border text-center text-lg font-semibold uppercase transition",
                            disabled
                              ? "border-dashed border-slate-300 bg-slate-100 text-slate-400"
                              : "border-slate-300 bg-white text-slate-800",
                            letter && !disabled && "bg-slate-900 text-white",
                          )}
                        >
                          {numbers.length > 0 && (
                            <span className="absolute left-1 top-1 text-[0.6rem] font-semibold text-slate-500">
                              {numbers.join("/")}
                            </span>
                          )}
                          {letter}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Clues</h2>
              <p className="mt-1 text-xs text-slate-500">
                Reveal hints to help solve each clue. Every hint deducts points
                from that word's final value.
              </p>

              <div className="mt-4 space-y-4">
                {words.map((word) => {
                  const isComplete = word.completed;
                  const remainingHints = word.hints.length - word.revealedHints;

                  return (
                    <div
                      key={word.id}
                      className={clsx(
                        "rounded-2xl border px-4 py-3 transition",
                        isComplete
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {word.number}. {word.orientation.replace("-", " ")}
                          </div>
                          <div className="text-xs text-slate-500">
                            Starts at row {word.start.row}, column {word.start.col}
                          </div>
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {word.answer.length} letters
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        {word.revealedHints === 0 ? (
                          <div className="italic text-slate-400">
                            Reveal a hint to get started.
                          </div>
                        ) : (
                          word.hints
                            .slice(0, word.revealedHints)
                            .map((hint, index) => (
                              <div key={`${word.id}-hint-${index}`}>
                                Hint {index + 1}: {hint}
                              </div>
                            ))
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {remainingHints > 0 && !isComplete && (
                          <button
                            type="button"
                            onClick={() => handleRevealHint(word)}
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
                          >
                            Reveal hint ({remainingHints} left)
                          </button>
                        )}
                        <input
                          type="text"
                          value={word.guess}
                          onChange={(event) =>
                            handleGuessChange(word.id, event.target.value)
                          }
                          disabled={isComplete}
                          placeholder="Type your answer"
                          className={clsx(
                            "min-w-[160px] flex-1 rounded-full border px-3 py-1.5 text-sm font-semibold uppercase tracking-widest focus:outline-none",
                            isComplete
                              ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                              : "border-slate-300 bg-white text-slate-900 focus:border-slate-500",
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => handleSubmitGuess(word)}
                          disabled={isComplete}
                          className={clsx(
                            "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition",
                            isComplete
                              ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                              : "border border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900",
                          )}
                        >
                          {isComplete ? "Solved" : "Check"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
              {summary ? (
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Correct words</span>
                    <span className="font-semibold">{summary.correctWords}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total hints used</span>
                    <span className="font-semibold">{summary.totalHintsUsed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Time</span>
                    <span className="font-semibold">
                      {formatClock(summary.completionTimeSeconds)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                    <span>Final score</span>
                    <span>{summary.finalScore}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-500">
                  Solve every word to see your final score.
                </div>
              )}

              <button
                type="button"
                onClick={handleRestart}
                className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
              >
                Restart puzzle
              </button>
            </div>
          </section>
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-100 p-6 text-center text-sm text-slate-500">
          Choose a puzzle to get started.
        </section>
      )}
    </div>
  );
}
