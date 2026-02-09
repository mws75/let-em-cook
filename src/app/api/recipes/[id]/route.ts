import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { deleteRecipe, getRecipeWithOwnership } from "@/lib/database/recipes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recipeId = Number(id);
    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId();
    const result = await getRecipeWithOwnership(userId, recipeId);

    if (!result) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(
      { recipe: result.recipe, isOwner: result.isOwner },
      { status: 200 },
    );
  } catch (error) {
    console.error("API Error, failed to fetch recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recipeId = Number(id);
    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    // Check data input
    const userId = await getAuthenticatedUserId();
    // make API Request
    const result = await deleteRecipe(userId, recipeId);

    // return response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.log("API Error, failed to delete post: ", error);
    return NextResponse.json(
      { error: "Failed to Delete Post" },
      { status: 400 },
    );
  }
}
