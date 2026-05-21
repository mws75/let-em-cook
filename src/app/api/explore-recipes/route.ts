import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthenticatedError } from "@/lib/auth";
import { getExploreRecipes } from "@/lib/database/recipes";
import { ExploreFilters } from "@/types/types";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    // Get Search Params from request
    const searchParams = request.nextUrl.searchParams;

    const filters: ExploreFilters = {
      search: searchParams.get("search") || undefined,
      category: searchParams.get("category") || undefined,
      calorieRange: searchParams.get(
        "calorieRange",
      ) as ExploreFilters["calorieRange"],
      limit: Number(searchParams.get("limit")) || 18,
      offset: Number(searchParams.get("offset")) || 0,
    };
    // call getExploreRecipes
    const { recipes, hasMore } = await getExploreRecipes(userId, filters);
    // return
    return NextResponse.json({ recipes, hasMore }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching recipes to explore: ", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}
