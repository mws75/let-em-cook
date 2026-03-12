import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getMealPlan, upsertMealPlan, deleteMealPlan } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const result = await getMealPlan(userId);

    if (!result) {
      return NextResponse.json({ plan: null }, { status: 200 });
    }

    const plan = typeof result.planJson === "string" ? JSON.parse(result.planJson) : result.planJson;
    return NextResponse.json(
      { plan, modifiedOn: result.modifiedOn },
      { status: 200 },
    );
  } catch (error) {
    console.error("failed to GET mealPlan", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch meal plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await request.json();

    if (!body.plan) {
      return NextResponse.json(
        { error: "Plan data is required" },
        { status: 400 },
      );
    }

    await upsertMealPlan(userId, JSON.stringify(body.plan));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to POST meal plan");
    const message =
      error instanceof Error ? error.message : "Failed to update meal plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    await deleteMealPlan(userId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unable to delete meal plan", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete meal plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
