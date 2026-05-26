import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthenticatedError } from "@/lib/auth";
import { toggleRecipeFavorite } from "@/lib/database/recipes";

function unauthenticated() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

/**
 * PATCH /api/recipes/[id]/favorite
 * Body: { is_favorite: boolean }
 *
 * Toggles the user's favorite flag on one of their own recipes. The recipe
 * must belong to the authenticated user (toggleRecipeFavorite filters on
 * user_id), so passing another user's recipe id returns 404.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recipeId = Number(id);
    if (!Number.isInteger(recipeId) || recipeId <= 0) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.is_favorite !== "boolean") {
      return NextResponse.json(
        { error: "Body must include is_favorite: boolean" },
        { status: 400 },
      );
    }

    const userId = await getAuthenticatedUserId();
    const result = await toggleRecipeFavorite(
      userId,
      recipeId,
      body.is_favorite,
    );

    if (!result) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return unauthenticated();
    console.error("API Error, failed to toggle favorite:", error);
    return NextResponse.json(
      { error: "Failed to toggle favorite" },
      { status: 500 },
    );
  }
}
