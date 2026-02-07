import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { countUserRecipes } from "@/lib/database/users";
import { FREE_TIER_RECIPE_LIMIT } from "@/types/types";

export async function GET() {
  try {
    console.log("=== user/subscription API called ===");

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    // Get recipe count
    const recipeCount = await countUserRecipes(user.user_id);

    // Determine limits based on plan
    const isPro = user.plan_tier === "pro";
    const recipeLimit = isPro ? null : FREE_TIER_RECIPE_LIMIT;
    const canCreateRecipe = isPro || recipeCount < FREE_TIER_RECIPE_LIMIT;

    const response = {
      planTier: user.plan_tier,
      recipeCount,
      recipeLimit,
      canCreateRecipe,
      stripeCustomerId: user.stripe_customer_id,
    };

    console.log("Subscription info:", response);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error getting subscription info:", error);
    return NextResponse.json(
      { error: "Failed to get subscription info" },
      { status: 500 },
    );
  }
}
