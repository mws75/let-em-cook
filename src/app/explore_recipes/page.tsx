"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { ExploreRecipe } from "@/types/types";
import ExploreRecipeCard from "@/components/ExploreRecipeCard";
import UpgradePrompt from "@/components/UpgradePrompt";
import SignUpPromptModal from "@/components/SignUpPromptModal";
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
  // Signed-out visitor clicked Add — holds the recipe they wanted
  const [promptRecipeId, setPromptRecipeId] = useState<number | null>(null);
  const autoAddTriggeredRef = useRef(false);
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
    fetchRecipes(0, false);
  }, [selectedCategory, selectedCalories]);

  // Debounced search
  useEffect(() => {

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

  // fromAutoAdd: triggered automatically after sign-up/sign-in from the popup
  const handleAddRecipe = async (recipeId: number, fromAutoAdd = false) => {
    if (!user) {
      setPromptRecipeId(recipeId);
      return;
    }

    const postAdd = () =>
      fetch(`/api/recipes/${recipeId}/add`, { method: "POST" });

    let response = await postAdd();

    // Right after sign-in the session cookie can lag behind Clerk's client
    // state. Give it a moment and retry once.
    if (fromAutoAdd && response.status === 401) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await postAdd();
    }

    if (fromAutoAdd && response.status === 401) {
      throw new Error("Still Finishing up.  Please tap Add to My Recipes again.");
    }

    const data = await response.json();

    // After auto-add, 409 means it's already theirs (e.g. a starter recipe)
    const alreadyAdded = fromAutoAdd && response.status === 409;

    if (!response.ok && !alreadyAdded) {
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

  // After sign-up/sign-in from the Add popup, Clerk sends the user back with
  // ?autoAdd=<recipeId> — finish the add for them, exactly once. Read from
  // window.location so this static page doesn't need a Suspense boundary.
  useEffect(() => {
    if (!isLoaded || !user || autoAddTriggeredRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const recipeId = Number(params.get("autoAdd"));
    if (!Number.isInteger(recipeId) || recipeId <= 0) return;
    autoAddTriggeredRef.current = true;

    // Drop autoAdd from the URL so a refresh doesn't re-add
    router.replace("/explore_recipes");

    handleAddRecipe(recipeId, true).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add recipe");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedCalories("");
  };

  return (
    <div>
      <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-10">
        <div className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
          {/* Main Container */}
          <div className="border border-border rounded-3xl bg-surface p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h1 className="text-3xl text-text font-bold">Explore Recipes</h1>
              {isLoaded && !user && (
                <div className="flex gap-2">
                  <SignInButton
                    mode="modal"
                    forceRedirectUrl="/explore_recipes"
                    signUpForceRedirectUrl="/explore_recipes"
                  >
                    <button className="px-5 py-2 bg-surface hover:bg-muted border border-border text-text rounded-xl text-sm font-bold transition-all duration-200">
                      Log In
                    </button>
                  </SignInButton>
                  <SignUpButton
                    mode="modal"
                    forceRedirectUrl="/explore_recipes"
                    signInForceRedirectUrl="/explore_recipes"
                  >
                    <button className="px-5 py-2 bg-accent hover:bg-accent/85 border border-accent/80 text-white rounded-xl text-sm font-bold transition-all duration-200">
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-3 border border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-accent hover:bg-accent/80 border border-border rounded-xl font-bold text-text transition-all"
              >
                Clear
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 flex-wrap">
              <span className="text-xl text-text font-bold">Filters</span>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-border rounded-xl bg-surface text-text focus:outline-none focus:border-accent transition-colors w-full sm:w-auto sm:min-w-[150px]"
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
                className="px-4 py-2 border border-border rounded-xl bg-surface text-text focus:outline-none focus:border-accent transition-colors w-full sm:w-auto sm:min-w-[150px]"
              >
                {CALORIE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-3 border border-border rounded-xl bg-secondary hover:bg-secondary/80 text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors w-full sm:w-auto sm:ml-auto sm:max-w-[250px]"
              >
                Back to Dashboard
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="border border-red-500 rounded-xl p-4 bg-red-50 mb-6">
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
      <footer className="w-full border-t border-border bg-surface mt-10">
        <div className="max-w-5xl mx-auto px-4 py-6 flex justify-center">
          <button
            onClick={() => router.push("/contact")}
            className="text-text-secondary hover:text-text font-semibold transition-colors"
          >
            Contact
          </button>
        </div>
      </footer>
      {/* Sign-up prompt for signed-out visitors who click Add */}
      <SignUpPromptModal
        isOpen={promptRecipeId !== null}
        onClose={() => setPromptRecipeId(null)}
        onKeepExploring={() => setPromptRecipeId(null)}
        showSignIn
        redirectUrl={`/explore_recipes?autoAdd=${promptRecipeId ?? ""}`}
      />
      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        recipeCount={recipeCount}
      />
    </div>
  );
}
