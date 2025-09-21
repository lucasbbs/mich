import type { Metadata } from "next";
import GameBuilder from "@/components/admin/game-builder";

export const metadata: Metadata = {
  title: "Game Builder | Word Grid Studio",
  description:
    "Configure grids, disable cells, and attach numbered clues from a single admin workspace.",
};

export default function AdminPage() {
  return <GameBuilder />;
}
