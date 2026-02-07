import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getExploreRecipes } from "@/lib/database/recipes";
import { ExploreFilters } from "@/types/types";

// TODO: Implement explore recipes API
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    // Get Search Params from request
    // Create the filter object
    // call getExploreRecipes
    // return
  } catch (error) {
    console.error("Error fetching recipes to explore: ", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}
