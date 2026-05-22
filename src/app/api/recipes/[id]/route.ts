import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  getOptionalAuthenticatedUserId,
  UnauthenticatedError,
} from "@/lib/auth";
import { deleteRecipe, getRecipeWithOwnership } from "@/lib/database/recipes";

function unauthenticated() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

// Public endpoint: signed-in users see their own recipes plus public ones
// (with isOwner set when applicable); anonymous users see only public recipes.
// TODO: add IP-based rate limiting before broad announcement of the URL.
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

    const userId = await getOptionalAuthenticatedUserId();
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
    if (error instanceof UnauthenticatedError) return unauthenticated();
    console.error("API Error, failed to delete recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 },
    );
  }
}
