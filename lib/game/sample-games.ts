import { computeWordCells } from "./utils";
import type { GameDraft, Orientation } from "./types";

type WordSeed = {
  id: string;
  number: number;
  answer: string;
  orientation: Orientation;
  start: { row: number; col: number };
  hints: string[];
};

function buildWords(seeds: WordSeed[]) {
  return seeds.map((seed) => ({
    ...seed,
    answer: seed.answer.toUpperCase(),
    cells: computeWordCells(seed.start, seed.answer.length, seed.orientation),
  }));
}

export const SAMPLE_GAMES: GameDraft[] = [
  {
    id: "orchard-opener",
    title: "Orchard Opener",
    rows: 6,
    columns: 6,
    disabledCells: [],
    words: buildWords([
      {
        id: "orchard-1",
        number: 1,
        answer: "apple",
        orientation: "horizontal",
        start: { row: 1, col: 1 },
        hints: [
          "Classic autumn fruit.",
          "Keeps the doctor away, according to the saying.",
        ],
      },
      {
        id: "orchard-2",
        number: 2,
        answer: "pear",
        orientation: "vertical",
        start: { row: 1, col: 3 },
        hints: [
          "Green fruit with a narrow top.",
          "Often poached for dessert.",
        ],
      },
      {
        id: "orchard-3",
        number: 3,
        answer: "grape",
        orientation: "horizontal",
        start: { row: 3, col: 1 },
        hints: [
          "Grows in bunches.",
          "A staple for winemaking.",
        ],
      },
      {
        id: "orchard-4",
        number: 4,
        answer: "elm",
        orientation: "vertical",
        start: { row: 1, col: 6 },
        hints: [
          "A common shade tree.",
          "Target of Dutch disease.",
        ],
      },
      {
        id: "orchard-5",
        number: 5,
        answer: "berry",
        orientation: "horizontal",
        start: { row: 5, col: 2 },
        hints: [
          "Small but sweet piece of fruit.",
          "Think straw-, blue-, or rasp-.",
        ],
      },
    ]),
  },
  {
    id: "weather-watch",
    title: "Weather Watch",
    rows: 7,
    columns: 7,
    disabledCells: [],
    words: buildWords([
      {
        id: "weather-1",
        number: 1,
        answer: "cloud",
        orientation: "horizontal",
        start: { row: 1, col: 1 },
        hints: [
          "What hides the sun on overcast days.",
          "Made of condensed water droplets.",
        ],
      },
      {
        id: "weather-2",
        number: 2,
        answer: "storm",
        orientation: "horizontal",
        start: { row: 3, col: 1 },
        hints: [
          "Severe weather event.",
          "Often paired with thunder.",
        ],
      },
      {
        id: "weather-3",
        number: 3,
        answer: "rain",
        orientation: "vertical",
        start: { row: 1, col: 7 },
        hints: [
          "What falls from the clouds.",
          "You might need an umbrella for it.",
        ],
      },
      {
        id: "weather-4",
        number: 4,
        answer: "wind",
        orientation: "vertical",
        start: { row: 2, col: 6 },
        hints: [
          "Air in motion.",
          "It can turn turbines.",
        ],
      },
      {
        id: "weather-5",
        number: 5,
        answer: "humid",
        orientation: "horizontal",
        start: { row: 5, col: 2 },
        hints: [
          "Sticky summer air feels this way.",
          "A measure of moisture.",
        ],
      },
    ]),
  },
];
