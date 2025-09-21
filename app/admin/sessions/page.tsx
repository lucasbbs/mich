import type { Metadata } from "next";
import dynamic from "next/dynamic";

const SessionManager = dynamic(
  () => import("@/components/admin/sessions/session-manager"),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "Admin Sessions | Word Grid Studio",
  description:
    "Log and review real-time game sessions, annotate learnings, and reference recent player performance.",
};

export default function AdminSessionsPage() {
  return <SessionManager />;
}
