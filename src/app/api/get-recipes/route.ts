import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthenticatedError } from "@/lib/auth";
import { getRecipes } from "@/lib/database/recipes";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    console.log(`Fetching recipes for user_id: ${userId}`);

    // Fetch recipes from database
    const recipes = await getRecipes(userId);

    console.log(`✅ Fetched ${recipes.length} recipes for user ${userId}`);

    return NextResponse.json({ recipes }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("❌ Error in get-recipes API:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 },
    );
  }
}
