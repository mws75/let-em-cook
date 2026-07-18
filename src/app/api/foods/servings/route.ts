import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthenticatedError } from "@/lib/auth";
import { enforceFoodRateLimit, RateLimitError } from "@/lib/rateLimit";
import { getFoodServings } from "@/lib/foods/searchFoods";
import { FoodSource } from "@/lib/foods/provider";

const SOURCES: FoodSource[] = ["usda"];

// GET /api/foods/servings?source=usda&id=168171
// Returns the human-friendly serving options for one food. USDA's search
// endpoint omits foodPortions, so the modal calls this once when a food is
// selected to populate the serving dropdown (macros still scale locally from
// the search result's per-100g values).
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const source = request.nextUrl.searchParams.get("source") ?? "";
    const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";

    if (!SOURCES.includes(source as FoodSource) || !id) {
      return NextResponse.json({ servings: [] }, { status: 400 });
    }

    await enforceFoodRateLimit(userId, "foods-servings");

    // Forward the request's signal so a client disconnect cancels the USDA fetch.
    const servings = await getFoodServings(
      source as FoodSource,
      id,
      request.signal,
    );
    return NextResponse.json({ servings }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many requests — slow down a moment." },
        { status: 429 },
      );
    }
    console.error("Failed to fetch food servings", error);
    return NextResponse.json(
      { error: "Couldn't load serving sizes." },
      { status: 502 },
    );
  }
}
