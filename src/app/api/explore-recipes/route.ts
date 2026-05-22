import { NextRequest, NextResponse } from "next/server";
import { getOptionalAuthenticatedUserId } from "@/lib/auth";
import { getExploreRecipes } from "@/lib/database/recipes";
import { ExploreFilters } from "@/types/types";

// Public endpoint: signed-in users get personalized results; anonymous users
// get the unpersonalized feed of all public, originally-created recipes.
// TODO: add IP-based rate limiting before broad announcement of the URL.
export async function GET(request: NextRequest) {
  try {
    const userId = await getOptionalAuthenticatedUserId();
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

    const { recipes, hasMore } = await getExploreRecipes(userId, filters);
    return NextResponse.json({ recipes, hasMore }, { status: 200 });
  } catch (error) {
    console.error("Error fetching recipes to explore: ", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}
