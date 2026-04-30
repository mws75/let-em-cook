import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  getUserMacroGoals,
  updateUserMacroGoals,
} from "@/lib/database";
import { MacroGoals } from "@/types/types";

function normalizeGoal(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Goal values must be non-negative numbers");
  }
  return Math.round(n);
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    const goals = await getUserMacroGoals(userId);
    return NextResponse.json({ goals }, { status: 200 });
  } catch (error) {
    console.error("Failed to GET user goals", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch goals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = (await request.json()) as Partial<MacroGoals>;

    let goals: MacroGoals;
    try {
      goals = {
        calories: normalizeGoal(body.calories),
        protein_g: normalizeGoal(body.protein_g),
        fat_g: normalizeGoal(body.fat_g),
        carbs_g: normalizeGoal(body.carbs_g),
      };
    } catch (validationError) {
      const message =
        validationError instanceof Error
          ? validationError.message
          : "Invalid goal value";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await updateUserMacroGoals(userId, goals);
    return NextResponse.json({ success: true, goals }, { status: 200 });
  } catch (error) {
    console.error("Failed to PUT user goals", error);
    const message =
      error instanceof Error ? error.message : "Failed to update goals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
