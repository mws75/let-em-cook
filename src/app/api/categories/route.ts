import { NextRequest, NextResponse } from "next/server";
import { getUserCategories } from "@/lib/database/categories";
import { getAuthenticatedUserId } from "@/lib/auth";
import { DEFAULT_CATEGORY_LIST } from "@/lib/categoryColors";

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");
    if (scope === "explore") {
      const categories = DEFAULT_CATEGORY_LIST.map((c) => ({
        category_name: c.name,
        color_hex: c.color_hex,
      }));
      return NextResponse.json({ categories }, { status: 200 });
    }
    const userId = getAuthenticatedUserId();
    const categories = await getUserCategories(userId);
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.log(error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to Import categories";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
