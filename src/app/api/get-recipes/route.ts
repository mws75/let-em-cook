import { NextRequest, NextResponse } from "next/server";
import { getRecipes } from "@/lib/database/getRecipes";
import { getOrCreateUser } from "@/lib/database/getOrCreateUser";

export async function GET(request: NextRequest) {
  try {
    // Get or create database user from Clerk authentication
    const userId = await getOrCreateUser();

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
