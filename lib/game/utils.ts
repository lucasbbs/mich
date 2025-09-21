import type {
  CellCoordinate,
  GameWord,
  LetterMap,
  Orientation,
} from "./types";

export const ORIENTATION_CONFIG: Record<Orientation, {
  label: string;
  delta: CellCoordinate;
}> = {
  horizontal: {
    label: "Horizontal",
    delta: { row: 0, col: 1 },
  },
  vertical: {
    label: "Vertical",
    delta: { row: 1, col: 0 },
  },
  "diagonal-down": {
    label: "Diagonal ↘",
    delta: { row: 1, col: 1 },
  },
  "diagonal-up": {
    label: "Diagonal ↗",
    delta: { row: -1, col: 1 },
  },
};

export const ORIENTATION_OPTIONS = (Object.keys(ORIENTATION_CONFIG) as Orientation[]).map(
  (key) => ({
    value: key,
    label: ORIENTATION_CONFIG[key].label,
  }),
);

export function toCellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function fromCellKey(key: string): CellCoordinate {
  const [row, col] = key.split(":").map(Number);
  return { row, col };
}

export function computeWordCells(
  start: CellCoordinate,
  length: number,
  orientation: Orientation,
): CellCoordinate[] {
  const delta = ORIENTATION_CONFIG[orientation].delta;
  const cells: CellCoordinate[] = [];

  for (let index = 0; index < length; index += 1) {
    cells.push({
      row: start.row + delta.row * index,
      col: start.col + delta.col * index,
    });
  }

  return cells;
}

export function isWithinGrid(
  cell: CellCoordinate,
  rows: number,
  columns: number,
): boolean {
  return (
    cell.row >= 1 &&
    cell.row <= rows &&
    cell.col >= 1 &&
    cell.col <= columns
  );
}

export function buildLetterMap(words: GameWord[]): LetterMap {
  const map: LetterMap = {};

  words.forEach((word) => {
    word.cells.forEach((cell, index) => {
      const letter = word.answer[index]?.toUpperCase() ?? "";
      if (!letter) {
        return;
      }

      map[toCellKey(cell.row, cell.col)] = letter;
    });
  });

  return map;
}

export type PlacementIssueType =
  | "out-of-bounds"
  | "disabled"
  | "letter-conflict";

export interface PlacementIssue {
  type: PlacementIssueType;
  cell: CellCoordinate;
  existingLetter?: string;
  incomingLetter?: string;
}

export function evaluateWordPlacement(params: {
  answer: string;
  start: CellCoordinate;
  orientation: Orientation;
  rows: number;
  columns: number;
  disabled: Set<string>;
  letterMap: LetterMap;
}): {
  cells: CellCoordinate[];
  issues: PlacementIssue[];
} {
  const { answer, start, orientation, rows, columns, disabled, letterMap } =
    params;
  const cells = computeWordCells(start, answer.length, orientation);
  const issues: PlacementIssue[] = [];

  cells.forEach((cell, index) => {
    const key = toCellKey(cell.row, cell.col);
    const letter = answer[index]?.toUpperCase() ?? "";

    if (!isWithinGrid(cell, rows, columns)) {
      issues.push({ type: "out-of-bounds", cell });
      return;
    }

    if (disabled.has(key)) {
      issues.push({ type: "disabled", cell });
    }

    const existing = letterMap[key];
    if (existing && existing !== letter) {
      issues.push({
        type: "letter-conflict",
        cell,
        existingLetter: existing,
        incomingLetter: letter,
      });
    }
  });

  return { cells, issues };
}
