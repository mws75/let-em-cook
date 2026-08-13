import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthenticatedError } from "@/lib/auth";
import { enforceFoodRateLimit, RateLimitError } from "@/lib/rateLimit";
import { searchFoods } from "@/lib/foods/searchFoods";

const MIN_QUERY_LENGTH = 2;

function unauthenticated() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

// GET /api/foods/search?q=...
// Parses the natural-language query, searches the food provider(s), and returns
// the matches plus the parsed quantity/unit so the UI can prefill the form.
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { results: [], parsed: null, source: null, status: "empty" },
        { status: 200 },
      );
    }

    await enforceFoodRateLimit(userId, "foods-search");

    // Forward the request's signal so a client disconnect cancels the USDA fetch.
    const { results, parsed, source, status } = await searchFoods(
      q,
      request.signal,
    );
    return NextResponse.json(
      { results, parsed, source, status },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof UnauthenticatedError) return unauthenticated();
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many searches — slow down a moment." },
        { status: 429 },
      );
    }
    console.error("Failed to search foods", error);
    return NextResponse.json(
      { error: "Couldn't reach the food database. Try again, or use Manual." },
      { status: 502 },
    );
  }
}
