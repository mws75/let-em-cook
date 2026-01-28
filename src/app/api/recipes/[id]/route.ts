import { NextRequest, NextResponse } from "next/server";
import { deleteRecipe } from "@/lib/database/deleteRecipe";
import { getOrCreateUser } from "@/lib/database/getOrCreateUser";
import { getRecipeById } from "@/lib/database/getRecipeById";

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

    const userId = await getOrCreateUser();
    const recipe = await getRecipeById(userId, recipeId);

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ recipe }, { status: 200 });
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
    const userId = await getOrCreateUser();
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
