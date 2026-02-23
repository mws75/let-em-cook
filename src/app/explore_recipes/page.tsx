"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ExploreRecipe } from "@/types/types";
import ExploreRecipeCard from "@/components/ExploreRecipeCard";
import UpgradePrompt from "@/components/UpgradePrompt";
import toast from "react-hot-toast";
import { DEFAULT_CATEGORY_LIST } from "@/lib/categoryColors";

const CALORIE_OPTIONS = [
  { value: "", label: "All Calories" },
  { value: "under300", label: "Under 300" },
  { value: "300to500", label: "300 - 500" },
  { value: "500to750", label: "500 - 750" },
  { value: "750to1000", label: "750 - 1000" },
  { value: "over1000", label: "Over 1000" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  ...DEFAULT_CATEGORY_LIST.map((c) => ({
    value: c.name,
    label: c.name.charAt(0).toUpperCase() + c.name.slice(1),
  })),
];

const BATCH_SIZE = 18;

export default function ExploreRecipes() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [recipes, setRecipes] = useState<ExploreRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCalories, setSelectedCalories] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  // Upgrade prompt
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [recipeCount, setRecipeCount] = useState(0);

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/signin");
    }
  }, [isLoaded, user, router]);

  const fetchRecipes = useCallback(
    async (offset: number, append: boolean = false) => {
      if (offset === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: BATCH_SIZE.toString(),
          offset: offset.toString(),
        });

        if (searchTerm) params.set("search", searchTerm);
        if (selectedCategory) params.set("category", selectedCategory);
        if (selectedCalories) params.set("calorieRange", selectedCalories);

        const response = await fetch(`/api/explore-recipes?${params}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch recipes");
        }

        const data = await response.json();

        if (append) {
          setRecipes((prev) => [...prev, ...data.recipes]);
        } else {
          setRecipes(data.recipes);
        }
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [searchTerm, selectedCategory, selectedCalories],
  );

  // Initial load and filter changes (except search - that's debounced)
  useEffect(() => {
    if (isLoaded && user) {
      fetchRecipes(0, false);
    }
  }, [isLoaded, user, selectedCategory, selectedCalories]);

  // Debounced search
  useEffect(() => {
    if (!isLoaded || !user) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchRecipes(0, false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingMore
        ) {
          fetchRecipes(recipes.length, true);
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [recipes.length, hasMore, isLoading, isLoadingMore, fetchRecipes]);

  const handleBack = () => {
    router.push("/dashboard");
  };

  const handleRecipeClick = async (recipeId: number) => {
    // Track click (fire and forget)
    fetch(`/api/recipes/${recipeId}/click`, { method: "POST" }).catch(() => {});
    router.push(`/recipe/${recipeId}?from=explore`);
  };

  const handleAddRecipe = async (recipeId: number) => {
    const response = await fetch(`/api/recipes/${recipeId}/add`, {
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      // Check if limit reached - show upgrade prompt
      if (data.limitReached) {
        setRecipeCount(data.recipeCount);
        setShowUpgradePrompt(true);
        return;
      }
      throw new Error(data.error || "Failed to add recipe");
    }

    toast.success("Recipe added to your collection!");
    // Remove from list since user now has it
    setRecipes((prev) => prev.filter((r) => r.recipe_id !== recipeId));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedCalories("");
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl text-text-secondary animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-10">
        <div className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
          {/* Main Container */}
          <div className="border-2 border-border rounded-3xl bg-surface shadow-lg p-6">
            {/* Header */}
            <h1 className="text-3xl text-text font-bold mb-6">
              Explore Recipes
            </h1>

            {/* Search Bar */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Clear
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <span className="text-xl text-text font-bold">Filters</span>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border-2 border-border rounded-xl bg-surface text-text focus:outline-none focus:border-accent transition-colors min-w-[150px]"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Calories Filter */}
              <select
                value={selectedCalories}
                onChange={(e) => setSelectedCalories(e.target.value)}
                className="px-4 py-2 border-2 border-border rounded-xl bg-surface text-text focus:outline-none focus:border-accent transition-colors min-w-[150px]"
              >
                {CALORIE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-3 border-2 border-border rounded-xl bg-secondary hover:bg-secondary/80 text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors ml-auto max-w-[250px]"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="border-2 border-red-500 rounded-xl p-4 bg-red-50 mb-6">
                <p className="text-red-700 font-semibold">{error}</p>
              </div>
            )}

            {/* Recipe Grid */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-2xl text-text font-semibold">
                  Finding delicious recipes...
                </p>
              </div>
            ) : recipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-2xl text-text font-semibold mb-2">
                  No recipes found
                </p>
                <p className="text-text-secondary">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recipes.map((recipe) => (
                    <ExploreRecipeCard
                      key={recipe.recipe_id}
                      recipe={recipe}
                      onAdd={handleAddRecipe}
                      onClick={handleRecipeClick}
                    />
                  ))}
                </div>

                {/* Load more trigger */}
                <div
                  ref={loadMoreRef}
                  className="h-20 flex items-center justify-center"
                >
                  {isLoadingMore && (
                    <p className="text-text-secondary">
                      Loading more recipes...
                    </p>
                  )}
                  {!hasMore && recipes.length > 0 && (
                    <p className="text-text-secondary">
                      You&apos;ve seen all recipes!
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Footer - Full width at bottom */}
      <footer className="w-full border-t-2 border-border bg-surface mt-10">
        <div className="max-w-5xl mx-auto px-4 py-6 flex justify-center">
          <button
            onClick={() => router.push("/contact")}
            className="text-text-secondary hover:text-text font-semibold transition-colors"
          >
            Contact
          </button>
        </div>
      </footer>
      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        recipeCount={recipeCount}
      />
    </div>
  );
}
