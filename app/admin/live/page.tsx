import type { Metadata } from "next";
import dynamic from "next/dynamic";

const LiveSessionLauncher = dynamic(
  () => import("@/components/admin/live/session-launcher"),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "Live Sessions | Word Grid Studio",
  description:
    "Create live multiplayer sessions, generate join codes and QR codes, and manage facilitator links.",
};

export default function AdminLiveSessionsPage() {
  return <LiveSessionLauncher />;
}
