import { NextRequest, NextResponse } from "next/server";

const EDGE_BASE_URL =
  process.env.SUPABASE_EDGE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL ??
  "https://bhqgxqkkwkvgoefpvkse.supabase.co/functions/v1";

const EDGE_TOKEN =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export async function POST(request: NextRequest) {
  if (!EDGE_TOKEN) {
    return NextResponse.json(
      { error: "Supabase Edge token missing" },
      { status: 500 },
    );
  }

  try {
    const payload = await request.json();
    const response = await fetch(`${EDGE_BASE_URL}/rapid-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EDGE_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error ?? "Edge function error", data },
        { status: response.status },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
