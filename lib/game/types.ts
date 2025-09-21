export type Orientation =
  | "horizontal"
  | "vertical"
  | "diagonal-down"
  | "diagonal-up";

export interface CellCoordinate {
  row: number;
  col: number;
}

export interface GameWord {
  id: string;
  number: number;
  answer: string;
  hints: string[];
  orientation: Orientation;
  start: CellCoordinate;
  cells: CellCoordinate[];
}

export interface GameDraft {
  id: string;
  title: string;
  rows: number;
  columns: number;
  disabledCells: string[];
  words: GameWord[];
  notes?: string;
}

export type LetterMap = Record<string, string>;
