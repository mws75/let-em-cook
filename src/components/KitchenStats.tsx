import {
  SubscriptionInfo,
  Recipe,
  FREE_TIER_RECIPE_LIMIT,
} from "@/types/types";

export default function KitchenState(
  subscription: SubscriptionInfo,
  recipes: Recipe[],
) {
  return (
    <section className="border-2 border-border rounded-3xl p-6 bg-surface shadow-lg">
      <h2 className="text-3xl text-text font-bold mb-6 text-center">
        📊 Your Kitchen Stats
      </h2>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side - Nutrition & Stats */}
        <div className="flex-1 space-y-4">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="bg-primary/20 border-2 border-border rounded-2xl p-4 hover:scale-[1.02] transition-transform shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">📖</span>
                <p className="text-sm text-text-secondary font-semibold">
                  Total Recipes
                </p>
              </div>
              <p className="text-3xl font-bold text-text ml-9">
                {subscription?.recipeCount ?? recipes.length}
                {subscription?.planTier !== "pro" && (
                  <span className="text-lg text-text-secondary">
                    /{FREE_TIER_RECIPE_LIMIT}
                  </span>
                )}
                {subscription?.planTier === "pro" && (
                  <span className="text-sm text-primary ml-2">Pro</span>
                )}
              </p>
            </div>

            <div className="bg-secondary/20 border-2 border-border rounded-2xl p-4 hover:scale-[1.02] transition-transform shadow-md">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⭐</span>
                <p className="text-sm text-text-secondary font-semibold">
                  Favorites
                </p>
              </div>
              <p className="text-3xl font-bold text-text ml-9">5</p>
            </div>
          </div>

          {/* Nutrition Information */}
          <div className="bg-muted border-2 border-border rounded-2xl p-5">
            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
              <span className="text-2xl">🥗</span>
              Average Nutrition
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <span className="text-text font-semibold">Calories</span>
                </div>
                <span className="text-text font-bold">300 cal</span>
              </div>

              <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💪</span>
                  <span className="text-text font-semibold">Protein</span>
                </div>
                <span className="text-text font-bold">10g</span>
              </div>

              <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🥑</span>
                  <span className="text-text font-semibold">Fat</span>
                </div>
                <span className="text-text font-bold">50g</span>
              </div>

              <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍬</span>
                  <span className="text-text font-semibold">Sugar</span>
                </div>
                <span className="text-text font-bold">10g</span>
              </div>

              <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌾</span>
                  <span className="text-text font-semibold">Carbs</span>
                </div>
                <span className="text-text font-bold">45g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Pie Chart */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 border-4 border-border rounded-full w-48 h-48 md:w-72 md:h-72 shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
              <div className="text-center">
                <p className="text-4xl md:text-6xl mb-2">📈</p>
                <p className="text-text-secondary font-semibold">
                  Chart Coming Soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
