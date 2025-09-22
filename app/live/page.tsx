import { Suspense } from "react";
import LiveJoinClient from "./live-join-client";

function LiveJoinFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="text-center text-sm text-slate-500">
        Loading session…
      </div>
    </main>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<LiveJoinFallback />}>
      <LiveJoinClient />
    </Suspense>
  );
}
