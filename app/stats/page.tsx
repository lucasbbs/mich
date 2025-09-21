import type { Metadata } from "next";
import dynamic from "next/dynamic";

const ScoreDashboard = dynamic(
  () => import("@/components/stats/score-dashboard"),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "Stats | Word Grid Studio",
  description:
    "Review puzzle scores, completion times, and hint usage across your sessions.",
};

export default function StatsPage() {
  return <ScoreDashboard />;
}
