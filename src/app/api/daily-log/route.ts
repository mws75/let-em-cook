import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  getDailyLog,
  upsertDailyLog,
  deleteDailyLog,
} from "@/lib/database";
import { DailyLog } from "@/types/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const date = request.nextUrl.searchParams.get("date");

    if (!date || !DATE_PATTERN.test(date)) {
      return badRequest("Query param 'date' is required (YYYY-MM-DD)");
    }

    const log = await getDailyLog(userId, date);
    return NextResponse.json({ log }, { status: 200 });
  } catch (error) {
    console.error("Failed to GET daily log", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch daily log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = (await request.json()) as Partial<DailyLog>;

    if (!body.log_date || !DATE_PATTERN.test(body.log_date)) {
      return badRequest("'log_date' is required (YYYY-MM-DD)");
    }
    if (!Array.isArray(body.entries)) {
      return badRequest("'entries' must be an array");
    }

    await upsertDailyLog(userId, {
      log_date: body.log_date,
      entries: body.entries,
      notes: body.notes,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to PUT daily log", error);
    const message =
      error instanceof Error ? error.message : "Failed to save daily log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const date = request.nextUrl.searchParams.get("date");

    if (!date || !DATE_PATTERN.test(date)) {
      return badRequest("Query param 'date' is required (YYYY-MM-DD)");
    }

    await deleteDailyLog(userId, date);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to DELETE daily log", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete daily log";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
