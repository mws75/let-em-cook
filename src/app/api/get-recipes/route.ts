import { NextRequest, NextResponse } from "next/server";
import { getRecipes } from "@/lib/database/getRecipes";

export async function GET(request: NextRequest) {
  try {
    // Get user_id from query params
    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("user_id");

    if (!userIdParam) {
      return NextResponse.json(
        { error: "Missing required parameter: user_id" },
        { status: 400 },
      );
    }

    const userId = parseInt(userIdParam, 10);

    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { error: "Invalid user_id parameter" },
        { status: 400 },
      );
    }

    console.log(`Fetching recipes for user_id: ${userId}`);

    // Fetch recipes from database
    const recipes = await getRecipes(userId);

    console.log(`✅ Fetched ${recipes.length} recipes for user ${userId}`);

    return NextResponse.json({ recipes }, { status: 200 });
  } catch (error) {
    console.error("❌ Error in get-recipes API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch recipes";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
