"use client";

import clsx from "clsx";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ORIENTATION_CONFIG,
  ORIENTATION_OPTIONS,
  buildLetterMap,
  evaluateWordPlacement,
  fromCellKey,
  toCellKey,
  type GameWord,
  type Orientation,
  type PlacementIssue,
} from "@/lib/game";

interface WordFormState {
  number: number;
  answer: string;
  orientation: Orientation;
  startRow: number;
  startCol: number;
  hint: string;
}

type BannerType = "info" | "success" | "error";

interface BannerState {
  type: BannerType;
  message: string;
}

const DEFAULT_ROWS = 10;
const DEFAULT_COLUMNS = 10;
const MIN_DIMENSION = 3;
const MAX_DIMENSION = 18;

function describeIssue(issue: PlacementIssue): string {
  const location = `Row ${issue.cell.row}, Col ${issue.cell.col}`;

  if (issue.type === "out-of-bounds") {
    return `${location} falls outside the current grid.`;
  }

  if (issue.type === "disabled") {
    return `${location} is disabled. Enable the cell or adjust the word.`;
  }

  if (issue.type === "letter-conflict") {
    return `${location} already contains "${issue.existingLetter}" and conflicts with "${issue.incomingLetter}".`;
  }

  return "Unable to place the word with the current configuration.";
}

export default function GameBuilder() {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [disabledCells, setDisabledCells] = useState<Set<string>>(new Set());
  const [words, setWords] = useState<GameWord[]>([]);
  const [disableMode, setDisableMode] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [formState, setFormState] = useState<WordFormState>({
    number: 1,
    answer: "",
    orientation: "horizontal",
    startRow: 1,
    startCol: 1,
    hint: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const sortedWords = useMemo(
    () => [...words].sort((a, b) => a.number - b.number),
    [words],
  );
  const letterMap = useMemo(() => buildLetterMap(words), [words]);
  const startNumberMap = useMemo(() => {
    const map: Record<string, string> = {};
    const tracker: Record<string, number[]> = {};

    words.forEach((word) => {
      const key = toCellKey(word.start.row, word.start.col);
      tracker[key] = tracker[key] ? [...tracker[key], word.number] : [word.number];
    });

    Object.keys(tracker).forEach((key) => {
      const numbers = tracker[key];
      map[key] = numbers.sort((a, b) => a - b).join("/");
    });

    return map;
  }, [words]);

  const editingWord = useMemo(
    () => words.find((word) => word.id === editingWordId) ?? null,
    [words, editingWordId],
  );
  const editingCells = useMemo(() => {
    if (!editingWord) {
      return new Set<string>();
    }

    return new Set<string>(
      editingWord.cells.map((cell) => toCellKey(cell.row, cell.col)),
    );
  }, [editingWord]);

  const nextNumber = useMemo(() => {
    if (!words.length) {
      return 1;
    }

    return Math.max(...words.map((word) => word.number)) + 1;
  }, [words]);

  const totalCells = rows * columns;
  const disabledCount = disabledCells.size;
  const playableCount = totalCells - disabledCount;

  const exportData = useMemo(
    () => ({
      rows,
      columns,
      disabledCells: Array.from(disabledCells).sort((a, b) =>
        a.localeCompare(b),
      ),
      words: sortedWords.map(({ id, ...word }) => ({
        number: word.number,
        answer: word.answer,
        hint: word.hint,
        orientation: word.orientation,
        start: word.start,
        cells: word.cells,
      })),
    }),
    [rows, columns, disabledCells, sortedWords],
  );

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setBanner(null);
    }, 4500);

    return () => window.clearTimeout(timeout);
  }, [banner]);

  useEffect(() => {
    setFormState((previous) => ({
      ...previous,
      startRow: Math.min(Math.max(1, previous.startRow), rows),
      startCol: Math.min(Math.max(1, previous.startCol), columns),
    }));
  }, [rows, columns]);

  useEffect(() => {
    if (!editingWord) {
      setFormState((previous) => ({
        ...previous,
        number: nextNumber,
      }));
      return;
    }

    setFormState({
      number: editingWord.number,
      answer: editingWord.answer,
      orientation: editingWord.orientation,
      startRow: editingWord.start.row,
      startCol: editingWord.start.col,
      hint: editingWord.hint,
    });
  }, [editingWord, nextNumber]);

  useEffect(() => {
    if (!editingWordId) {
      return;
    }

    const stillExists = words.some((word) => word.id === editingWordId);
    if (!stillExists) {
      setEditingWordId(null);
    }
  }, [words, editingWordId]);

  const showBanner = (type: BannerType, message: string) => {
    setBanner({ type, message });
  };

  const pruneForResize = (nextRows: number, nextColumns: number) => {
    setDisabledCells((previous) => {
      if (!previous.size) {
        return previous;
      }

      let mutated = false;
      const next = new Set<string>();

      previous.forEach((key) => {
        const { row, col } = fromCellKey(key);
        if (
          row >= 1 &&
          row <= nextRows &&
          col >= 1 &&
          col <= nextColumns
        ) {
          next.add(key);
        } else {
          mutated = true;
        }
      });

      return mutated ? next : previous;
    });

    setWords((previous) =>
      previous.filter((word) =>
        word.cells.every(
          (cell) =>
            cell.row >= 1 &&
            cell.row <= nextRows &&
            cell.col >= 1 &&
            cell.col <= nextColumns,
        ),
      ),
    );
  };

  const handleRowChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = Number(event.target.value);
    const candidate = Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_ROWS;
    const next = Math.min(
      MAX_DIMENSION,
      Math.max(MIN_DIMENSION, candidate || DEFAULT_ROWS),
    );

    if (next === rows) {
      setRows(next);
      return;
    }

    setRows(next);
    pruneForResize(next, columns);
    showBanner("info", `Grid updated to ${next} rows × ${columns} columns.`);
  };

  const handleColumnChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = Number(event.target.value);
    const candidate = Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_COLUMNS;
    const next = Math.min(
      MAX_DIMENSION,
      Math.max(MIN_DIMENSION, candidate || DEFAULT_COLUMNS),
    );

    if (next === columns) {
      setColumns(next);
      return;
    }

    setColumns(next);
    pruneForResize(rows, next);
    showBanner("info", `Grid updated to ${rows} rows × ${next} columns.`);
  };

  const toggleDisableMode = () => {
    const next = !disableMode;
    setDisableMode(next);
    showBanner(
      "info",
      next
        ? "Disable mode enabled. Click grid cells to toggle whether they are playable."
        : "Disable mode turned off.",
    );
  };

  const handleCellClick = (row: number, col: number) => {
    const key = toCellKey(row, col);

    if (disableMode) {
      if (letterMap[key]) {
        showBanner(
          "error",
          "This cell is part of an existing word. Remove or adjust the word before disabling it.",
        );
        return;
      }

      setDisabledCells((previous) => {
        const next = new Set(previous);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      return;
    }

    setFormState((previous) => ({
      ...previous,
      startRow: row,
      startCol: col,
    }));
    showBanner("info", `Start cell set to row ${row}, column ${col}.`);
  };

  const resetForm = () => {
    setEditingWordId(null);
    setFormError(null);
    setFormState((previous) => ({
      number: nextNumber,
      answer: "",
      orientation: "horizontal",
      startRow: Math.min(previous.startRow, rows),
      startCol: Math.min(previous.startCol, columns),
      hint: "",
    }));
  };

  const handleSaveWord = () => {
    setFormError(null);

    const normalizedAnswer = formState.answer.replace(/\s+/g, "").toUpperCase();
    if (!normalizedAnswer) {
      setFormError("Add the answer text before saving.");
      return;
    }
    if (!/^[A-Z0-9]+$/.test(normalizedAnswer)) {
      setFormError("Answers can only include letters and numbers.");
      return;
    }

    if (formState.startRow < 1 || formState.startRow > rows) {
      setFormError("Choose a start row that sits inside the grid.");
      return;
    }

    if (formState.startCol < 1 || formState.startCol > columns) {
      setFormError("Choose a start column that sits inside the grid.");
      return;
    }

    const trimmedHint = formState.hint.trim();
    if (!trimmedHint) {
      setFormError("Every word needs a hint before it can be saved.");
      return;
    }

    const numberCollision = words.some(
      (word) => word.number === formState.number && word.id !== editingWordId,
    );
    if (numberCollision) {
      setFormError(
        `Word number ${formState.number} is already in use. Pick a new clue number.`,
      );
      return;
    }

    const baseLetterMap = buildLetterMap(
      editingWordId
        ? words.filter((word) => word.id !== editingWordId)
        : words,
    );

    const placement = evaluateWordPlacement({
      answer: normalizedAnswer,
      start: { row: formState.startRow, col: formState.startCol },
      orientation: formState.orientation,
      rows,
      columns,
      disabled: disabledCells,
      letterMap: baseLetterMap,
    });

    if (placement.issues.length) {
      const details = placement.issues.map(describeIssue).join("\n");
      setFormError(details);
      return;
    }

    const payload: GameWord = {
      id: editingWordId ?? crypto.randomUUID(),
      number: formState.number,
      answer: normalizedAnswer,
      hint: trimmedHint,
      orientation: formState.orientation,
      start: {
        row: formState.startRow,
        col: formState.startCol,
      },
      cells: placement.cells,
    };

    setWords((previous) => {
      if (editingWordId) {
        return previous.map((word) => (word.id === editingWordId ? payload : word));
      }
      return [...previous, payload];
    });

    showBanner(
      "success",
      editingWordId ? "Word updated." : "Word added to the puzzle.",
    );
    resetForm();
  };

  const handleWordEdit = (word: GameWord) => {
    setEditingWordId(word.id);
    setFormError(null);
  };

  const handleWordRemove = (word: GameWord) => {
    setWords((previous) => previous.filter((item) => item.id !== word.id));
    if (editingWordId === word.id) {
      resetForm();
    }
    showBanner("success", `Removed word ${word.number}.`);
  };

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold text-slate-900">
          Game builder
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Configure your puzzle grid, mark unavailable cells, and attach numbered
          words with the hints solvers will see. Everything below updates in
          real-time, so you always know what the final board will look like.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1">
            {rows} rows × {columns} columns
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1">
            {playableCount} playable cells
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1">
            {sortedWords.length} words
          </span>
        </div>
      </header>

      {banner && (
        <div
          className={clsx(
            "rounded-2xl border px-4 py-3 text-sm",
            banner.type === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-700",
            banner.type === "info" && "border-slate-200 bg-slate-100 text-slate-700",
            banner.type === "error" && "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          {banner.message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex flex-col text-sm font-medium text-slate-600">
                Rows
                <input
                  type="number"
                  min={MIN_DIMENSION}
                  max={MAX_DIMENSION}
                  value={rows}
                  onChange={handleRowChange}
                  className="mt-1 w-28 rounded-lg border border-slate-200 px-3 py-2 text-base font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col text-sm font-medium text-slate-600">
                Columns
                <input
                  type="number"
                  min={MIN_DIMENSION}
                  max={MAX_DIMENSION}
                  value={columns}
                  onChange={handleColumnChange}
                  className="mt-1 w-28 rounded-lg border border-slate-200 px-3 py-2 text-base font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={toggleDisableMode}
                className={clsx(
                  "inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition",
                  disableMode
                    ? "border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-500"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900",
                )}
              >
                {disableMode ? "Disable mode active" : "Toggle disabled cells"}
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              While disable mode is active, click any cell to toggle whether it
              belongs to the playable grid. When disable mode is off, clicking a
              cell sets the starting point for the next word.
            </p>

            <div className="mt-6 overflow-x-auto">
              <div
                className="mx-auto grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  maxWidth: "min(100%, 600px)",
                }}
              >
                {Array.from({ length: rows }).map((_, rowIndex) => (
                  <div key={`row-${rowIndex}`} className="contents">
                    {Array.from({ length: columns }).map((__, columnIndex) => {
                      const row = rowIndex + 1;
                      const col = columnIndex + 1;
                      const key = toCellKey(row, col);
                      const disabled = disabledCells.has(key);
                      const letter = letterMap[key] ?? "";
                      const numbers = startNumberMap[key];
                      const isEditingCell = editingCells.has(key);

                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => handleCellClick(row, col)}
                          className={clsx(
                            "relative aspect-square select-none rounded-md border text-center text-lg font-semibold uppercase transition",
                            disabled
                              ? "cursor-pointer border-slate-200 bg-slate-200 text-slate-400"
                              : "cursor-pointer border-slate-300 bg-white text-slate-800 hover:border-slate-500",
                            letter && !disabled &&
                              "bg-slate-900 text-white hover:border-slate-900",
                            isEditingCell &&
                              "ring-2 ring-indigo-400 ring-offset-2 ring-offset-white",
                          )}
                        >
                          {numbers && (
                            <span className="absolute left-1 top-1 text-[0.6rem] font-semibold text-slate-500">
                              {numbers}
                            </span>
                          )}
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Game data</h2>
            <p className="mt-1 text-xs text-slate-500">
              Copy this JSON payload into your storage layer or share it with
              teammates to keep everyone synced on the latest configuration.
            </p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(exportData, null, 2)}
            </pre>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {editingWord ? `Edit word ${editingWord.number}` : "Add a word"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Set the clue number, answer, direction, and hint. Start row and
              column are 1-indexed.
            </p>

            <div className="mt-4 grid gap-4">
              <label className="flex flex-col text-sm font-medium text-slate-600">
                Clue number
                <input
                  type="number"
                  min={1}
                  value={formState.number}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      number: Math.max(1, Math.floor(Number(event.target.value) || 1)),
                    }))
                  }
                  className="mt-1 w-28 rounded-lg border border-slate-200 px-3 py-2 text-base font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                />
              </label>

              <label className="flex flex-col text-sm font-medium text-slate-600">
                Answer
                <input
                  type="text"
                  value={formState.answer}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      answer: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="E.G. WORDPLAY"
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-base font-semibold tracking-widest text-slate-900 focus:border-slate-500 focus:outline-none"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col text-sm font-medium text-slate-600">
                  Orientation
                  <select
                    value={formState.orientation}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        orientation: event.target.value as Orientation,
                      }))
                    }
                    className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                  >
                    {ORIENTATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col text-sm font-medium text-slate-600">
                    Start row
                    <input
                      type="number"
                      min={1}
                      max={rows}
                      value={formState.startRow}
                      onChange={(event) =>
                        setFormState((previous) => ({
                          ...previous,
                          startRow: Math.min(
                            rows,
                            Math.max(1, Math.floor(Number(event.target.value) || 1)),
                          ),
                        }))
                      }
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-base font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                    />
                  </label>

                  <label className="flex flex-col text-sm font-medium text-slate-600">
                    Start column
                    <input
                      type="number"
                      min={1}
                      max={columns}
                      value={formState.startCol}
                      onChange={(event) =>
                        setFormState((previous) => ({
                          ...previous,
                          startCol: Math.min(
                            columns,
                            Math.max(1, Math.floor(Number(event.target.value) || 1)),
                          ),
                        }))
                      }
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-base font-semibold text-slate-900 focus:border-slate-500 focus:outline-none"
                    />
                  </label>
                </div>
              </div>

              <label className="flex flex-col text-sm font-medium text-slate-600">
                Hint
                <textarea
                  value={formState.hint}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      hint: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Describe the answer or give solvers a nudge."
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                />
              </label>
            </div>

            {formError && (
              <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveWord}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                {editingWord ? "Save changes" : "Add word"}
              </button>
              {editingWord && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                >
                  Cancel edit
                </button>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Words</h2>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                {sortedWords.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Words are ordered by clue number. Selecting a word loads it into the
              form for quick adjustments.
            </p>

            <div className="mt-4 space-y-3">
              {sortedWords.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 px-4 py-6 text-center text-xs text-slate-500">
                  Add your first word to see it listed here.
                </div>
              )}

              {sortedWords.map((word) => (
                <div
                  key={word.id}
                  className={clsx(
                    "rounded-2xl border px-4 py-3 text-sm transition",
                    editingWordId === word.id
                      ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {word.number}. {word.answer}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ORIENTATION_CONFIG[word.orientation].label} • starts at
                        row {word.start.row}, column {word.start.col}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => handleWordEdit(word)}
                        className="rounded-full border border-slate-300 px-3 py-1 text-slate-600 transition hover:border-slate-500 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWordRemove(word)}
                        className="rounded-full border border-rose-300 px-3 py-1 text-rose-600 transition hover:border-rose-500 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Hint: {word.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
