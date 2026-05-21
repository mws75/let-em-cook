import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthenticatedError } from "@/lib/auth";
import { getMealPlan, upsertMealPlan, deleteMealPlan } from "@/lib/database";

function unauthenticated() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

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
    if (error instanceof UnauthenticatedError) return unauthenticated();
    console.error("failed to GET mealPlan", error);
    return NextResponse.json(
      { error: "Failed to fetch meal plan" },
      { status: 500 },
    );
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
    if (error instanceof UnauthenticatedError) return unauthenticated();
    console.error("Failed to PUT meal plan", error);
    return NextResponse.json(
      { error: "Failed to update meal plan" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    await deleteMealPlan(userId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return unauthenticated();
    console.error("Unable to delete meal plan", error);
    return NextResponse.json(
      { error: "Failed to delete meal plan" },
      { status: 500 },
    );
  }
}
