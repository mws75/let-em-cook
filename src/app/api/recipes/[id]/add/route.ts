import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { copyRecipeToUser, hasUserAddedRecipe } from "@/lib/database/recipes";
import { countUserRecipes } from "@/lib/database/users";
import { FREE_TIER_RECIPE_LIMIT } from "@/types/types";
import { getUserById } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();

    // Check if user can create/add recipes (plan limit)
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const recipeId = parseInt(id, 10);

    if (isNaN(recipeId)) {
      return NextResponse.json(
        { error: "Invalid recipe ID" },
        { status: 400 },
      );
    }

    // Check if user already added this recipe
    const alreadyAdded = await hasUserAddedRecipe(userId, recipeId);
    if (alreadyAdded) {
      return NextResponse.json(
        { error: "You have already added this recipe" },
        { status: 409 },
      );
    }

    const recipeCount = await countUserRecipes(userId);
    const canCreate = user.plan_tier === "pro" || recipeCount < FREE_TIER_RECIPE_LIMIT;

    if (!canCreate) {
      return NextResponse.json(
        {
          error: "Recipe limit reached. Upgrade to Pro for unlimited recipes.",
          recipeCount,
          limitReached: true,
        },
        { status: 403 },
      );
    }

    const { newRecipeId } = await copyRecipeToUser(recipeId, userId);

    return NextResponse.json(
      {
        success: true,
        newRecipeId,
        message: "Recipe added to your collection!",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error adding recipe:", error);
    return NextResponse.json(
      { error: "Failed to add recipe" },
      { status: 500 },
    );
  }
}
