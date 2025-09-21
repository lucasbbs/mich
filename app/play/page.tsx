import type { Metadata } from "next";
import dynamic from "next/dynamic";

const GamePlayer = dynamic(() => import("@/components/play/game-player"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "Play | Word Grid Studio",
  description:
    "Solve puzzles, reveal hints as needed, and track your score across grids.",
};

export default function PlayPage() {
  return <GamePlayer />;
}
