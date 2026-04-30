import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getDailyLogRange } from "@/lib/database";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 90;

function diffInDays(start: string, end: string): number {
  const s = Date.parse(`${start}T00:00:00Z`);
  const e = Date.parse(`${end}T00:00:00Z`);
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const start = request.nextUrl.searchParams.get("start");
    const end = request.nextUrl.searchParams.get("end");

    if (!start || !DATE_PATTERN.test(start)) {
      return NextResponse.json(
        { error: "Query param 'start' is required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }
    if (!end || !DATE_PATTERN.test(end)) {
      return NextResponse.json(
        { error: "Query param 'end' is required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }
    if (start > end) {
      return NextResponse.json(
        { error: "'start' must be on or before 'end'" },
        { status: 400 },
      );
    }
    if (diffInDays(start, end) > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Range cannot exceed ${MAX_RANGE_DAYS} days` },
        { status: 400 },
      );
    }

    const logs = await getDailyLogRange(userId, start, end);
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error("Failed to GET daily log range", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch daily logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
