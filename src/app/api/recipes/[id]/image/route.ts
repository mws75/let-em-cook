import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthenticatedError } from "@/lib/auth";
import { updateRecipeImage, clearRecipeImage } from "@/lib/database/recipes";
import {
  uploadRecipeImage,
  deleteObjectByUrl,
  validateImage,
} from "@/lib/storage";

function unauthenticated() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

function parseRecipeId(id: string): number | null {
  const recipeId = Number(id);
  return Number.isInteger(recipeId) && recipeId > 0 ? recipeId : null;
}

/**
 * POST /api/recipes/[id]/image
 * Body: multipart/form-data with a `file` field (JPEG/PNG/WebP, <= 5 MB).
 *
 * Uploads the photo to DigitalOcean Spaces and stores its public CDN URL on the
 * recipe. The recipe must belong to the authenticated user (updateRecipeImage
 * filters on user_id), so another user's recipe id returns 404. When replacing
 * an existing photo, the previous Spaces object is deleted (best-effort).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recipeId = parseRecipeId(id);
    if (recipeId === null) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Body must include a `file` field" },
        { status: 400 },
      );
    }

    const check = validateImage({ contentType: file.type, size: file.size });
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error },
        { status: check.status },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadRecipeImage(recipeId, buffer, file.type);

    const result = await updateRecipeImage(userId, recipeId, url);
    if (!result) {
      // Not owned by this user — undo the upload we just made.
      await deleteObjectByUrl(url);
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Clean up the replaced photo, if any (best-effort; never fails the request).
    if (result.previousUrl && result.previousUrl !== url) {
      await deleteObjectByUrl(result.previousUrl);
    }

    return NextResponse.json({ image_url: result.image_url }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return unauthenticated();
    console.error("API Error, failed to upload recipe image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/recipes/[id]/image
 * Clears the recipe photo and deletes the Spaces object (best-effort).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recipeId = parseRecipeId(id);
    if (recipeId === null) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const userId = await getAuthenticatedUserId();
    const result = await clearRecipeImage(userId, recipeId);
    if (!result) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await deleteObjectByUrl(result.previousUrl);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return unauthenticated();
    console.error("API Error, failed to delete recipe image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 },
    );
  }
}
