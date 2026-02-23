"use client";
import RecipeDetailModal from "@/components/RecipeDetailModal";
import RecipeCard from "@/components/RecipeCard";
import { SignOutButton } from "@clerk/nextjs";
import SelectedRecipeCard from "@/components/SelectedRecipeCard";
import UpgradeButton from "@/components/UpgradeButton";
import UpgradePrompt from "@/components/UpgradePrompt";
import {
  Recipe,
  SubscriptionInfo,
  FREE_TIER_RECIPE_LIMIT,
  GroceryItem,
  Ingredients,
} from "@/types/types";
import { formatQuantity } from "@/lib/unitConverter";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { DEFAULT_CATEGORY_LIST } from "@/lib/categoryColors";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [viewingRecipeId, setViewingRecipeId] = useState<number | null>(null);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<string[]>(
    DEFAULT_CATEGORY_LIST.map((c) => c.name),
  );
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null,
  );
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Fetch recipes on component mount
  useEffect(() => {
    // Wait for Clerk to load and ensure user is authenticated
    if (!isLoaded) return;

    if (!user) {
      router.push("/signin");
      return;
    }

    const fetchRecipes = async () => {
      try {
        setIsLoadingRecipes(true);
        setError(null);

        const response = await fetch("/api/get-recipes");

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch recipes");
        }

        const data = await response.json();
        setRecipes(data.recipes);
        console.log(`Loaded ${data.recipes.length} recipes from database`);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load recipes";
        setError(errorMessage);
        console.error("Error fetching recipes:", err);
      } finally {
        setIsLoadingRecipes(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categoires");
        if (response.ok) {
          const data = await response.json();
          const userCustomCategories: string[] = data.categories.map(
            (c: { category_name: string }) => c.category_name,
          );
          const defaultNames = new Set(
            DEFAULT_CATEGORY_LIST.map((c) => c.name),
          );
          const extraCategories = userCustomCategories.filter(
            (n) => !defaultNames.has(n),
          );
          if (extraCategories.length > 0) {
            setCategories((prev) => [...prev, ...extraCategories]);
          }
        }
      } catch (error) {
        console.error("Error fetching categories", error);
      }
    };

    fetchRecipes();
    fetchCategories();
  }, [isLoaded, user, router]);

  // Fetch subscription info
  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchSubscription = async () => {
      try {
        const response = await fetch("/api/user/subscription");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
      }
    };

    fetchSubscription();
  }, [isLoaded, user]);

  // Handle recipe creation/update success
  useEffect(() => {
    const recipeSuccess = sessionStorage.getItem("recipe_success");
    if (recipeSuccess) {
      sessionStorage.removeItem("recipe_success");
      toast.success(
        recipeSuccess === "updated"
          ? "Recipe updated successfully!"
          : "Recipe added successfully!",
        { duration: 4000 },
      );
    }
  }, []);

  // Handle upgrade success
  useEffect(() => {
    const upgradeStatus = searchParams.get("upgrade");
    if (upgradeStatus === "success") {
      toast.success("Welcome to Pro! You now have unlimited recipes.", {
        duration: 5000,
        icon: "🎉",
      });
      // Clear the URL param
      router.replace("/dashboard");
      // Refresh subscription info
      fetch("/api/user/subscription")
        .then((res) => res.json())
        .then((data) => setSubscription(data))
        .catch(console.error);
    }
  }, [searchParams, router]);

  const filteredRecipes = recipes.filter((recipe) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = recipe.name.toLowerCase().includes(searchLower);

    const categoryMatch = selectedCategory === ""
      || recipe.category.toLowerCase() === selectedCategory.toLowerCase();
    const ingredientsMatch = recipe.ingredients_json.some((ingredient) => {
      return ingredient.name.toLowerCase().includes(searchLower);
    });
    return (nameMatch || ingredientsMatch) && categoryMatch;
  });

  const handleCreateRecipeClick = () => {
    // Check if user can create more recipes
    if (subscription && !subscription.canCreateRecipe) {
      setShowUpgradePrompt(true);
      return;
    }
    router.push("/create_recipe");
  };

  const handleRecipeClick = (recipeId: number) => {
    setViewingRecipeId(recipeId);
  };

  const handleModalClose = () => {
    setViewingRecipeId(null);
  };

  const handleExploreClick = () => {
    router.push("/explore_recipes");
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (err) {
      console.error("Error opening portal:", err);
    }
  };

  const handleSignOut = () => {};

  const handleRecipeCheckBoxSelect = (recipe: Recipe, isChecked: boolean) => {
    if (isChecked) {
      // Add selected recipe
      setSelectedRecipes([...selectedRecipes, recipe]);
      console.log(selectedRecipes);
    } else {
      // Remove selected recipe
      setSelectedRecipes(
        selectedRecipes.filter((r) => r.recipe_id !== recipe.recipe_id),
      );
      console.log(`Recipe ${recipe.name} deselected`);
    }
  };

  const handleRecipeDelete = (recipe_id: number) => {
    setRecipes(recipes.filter((r) => r.recipe_id !== recipe_id));
  };

  const handleClearSelected = () => {
    setSelectedRecipes([]);
  };

  const generateGroceryList = async () => {
    if (selectedRecipes.length === 0) {
      setError("Please select at least one recipe first");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Extract full ingredient objects from selected recipes
      const allIngredients: Ingredients[] = [];

      selectedRecipes.forEach((recipe) => {
        recipe.ingredients_json.forEach((ingredient) => {
          allIngredients.push(ingredient);
        });
      });

      // Call API to aggregate and sort ingredients
      const response = await fetch("/api/sort-grocery-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients: allIngredients }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate grocery list");
      }

      const data = await response.json();
      setGroceryList(data.groceryItems);

      // Initialize all items as checked (default to true)
      const initialCheckedState: { [key: string]: boolean } = {};
      data.groceryItems.forEach((item: GroceryItem, index: number) => {
        const key = `${item.name}-${item.unit}-${index}`;
        initialCheckedState[key] = true;
      });
      setCheckedItems(initialCheckedState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error generating grocery list:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleGroceryItem = (itemKey: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const selectAllItems = () => {
    const allChecked: { [key: string]: boolean } = {};
    groceryList.forEach((item, index) => {
      const key = `${item.name}-${item.unit}-${index}`;
      allChecked[key] = true;
    });
    setCheckedItems(allChecked);
  };

  const deselectAllItems = () => {
    const allUnchecked: { [key: string]: boolean } = {};
    groceryList.forEach((item, index) => {
      const key = `${item.name}-${item.unit}-${index}`;
      allUnchecked[key] = false;
    });
    setCheckedItems(allUnchecked);
  };

  const formatGroceryItemDisplay = (item: GroceryItem): string => {
    if (item.quantity && item.unit) {
      return `${formatQuantity(item.quantity)} ${item.unit} ${item.displayName}`;
    } else if (item.quantity) {
      return `${formatQuantity(item.quantity)} ${item.displayName}`;
    }
    return item.displayName;
  };

  const downloadGroceryList = () => {
    // Only include checked items
    const checkedIngredients = groceryList.filter((item, index) => {
      const key = `${item.name}-${item.unit}-${index}`;
      return checkedItems[key];
    });

    if (checkedIngredients.length === 0) {
      setError("Please select at least one item to download");
      return;
    }

    // Create text file content with quantities
    const textContent = checkedIngredients
      .map((item) => formatGroceryItemDisplay(item))
      .join("\n");

    // Create blob and download
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "grocery-list.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {viewingRecipeId && (
        <RecipeDetailModal
          recipeId={viewingRecipeId}
          onCloseClick={handleModalClose}
          onDelete={(recipeId) => {
            handleRecipeDelete(recipeId);
            handleModalClose();
          }}
        />
      )}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        recipeCount={subscription?.recipeCount || 0}
      />
      <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-10">
        {/* Header Information */}
        <div className="flex justify-center mt-10 mb-10">
          <h1 className="text-4xl text-text font-bold">
            🔪 Let's Get Cooking!
          </h1>
        </div>

        {/* Meal Prep Section */}
        <section className="border-2 border-border rounded-3xl p-2 bg-surface shadow-lg">
          <div className="flex gap-4 m-2">
            <div className="flex-1 border-2 border-border rounded-3xl p-8 bg-surface">
              <div className="flex flex-wrap gap-4">
                {selectedRecipes.map((recipe) => (
                  <SelectedRecipeCard key={recipe.recipe_id} recipe={recipe} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={generateGroceryList}
                disabled={isGenerating || selectedRecipes.length === 0}
                className="w-32 bg-primary hover:bg-primary/80 border-2 border-border rounded-3xl py-4 mb-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="text-1xl font-bold text-text">
                  {isGenerating ? "Generating..." : "Generate Grocery List"}
                </span>
              </button>
              <button
                onClick={handleClearSelected}
                className="w-32 bg-accent hover:bg-accent/80 border-2 border-border rounded-3xl py-4 mb-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="text-1xl font-bold text-text">
                  Clear Selected
                </span>
              </button>
            </div>
          </div>
          {/* Upgrade Button for free users */}
          {subscription && subscription.planTier !== "pro" && (
            <UpgradeButton className="mb-2" />
          )}
          {/* Manage Subscription for Pro users */}
          <div className="flex gap-4">
            {subscription && subscription.planTier === "pro" && (
              <button
                onClick={handleManageSubscription}
                className="w-full bg-accent hover:bg-accent/80 border-2 border-border rounded-3xl py-3 mb-2 shadow-md hover:shadow-lg transition-all"
              >
                <span className="text-lg font-semibold text-text">
                  Manage Subscription
                </span>
              </button>
            )}
            <SignOutButton redirectUrl="/">
              <button
                onClick={handleSignOut}
                className="w-full bg-muted hobver:bg-muted/80 border-2 border-border rounded-3xl py-3 mb-2 shadow-md hover:shadow-lg transition-all"
              >
                <span className="text-lg font-semibold text-text">
                  Sign Out
                </span>
              </button>
            </SignOutButton>
          </div>
          <button
            className="w-full my-2 bg-secondary hover:bg-secondary/80 border-2 border-border rounded-3xl py-4 shadow-md hover:shadow-lg transition-all"
            onClick={handleExploreClick}
          >
            <span className="text-2xl font-bold text-text">
              Explore Recipes
            </span>
          </button>
          <button
            className="w-full bg-primary hover:bg-primary/80 border-2 border-border rounded-3xl py-4 shadow-md hover:shadow-lg transition-all"
            onClick={handleCreateRecipeClick}
          >
            <span className="text-2xl font-bold text-text">Create Recipe</span>
          </button>
        </section>

        {/* Error Display */}
        {error && (
          <div className="border-2 border-red-500 rounded-3xl p-4 bg-red-50 shadow-lg">
            <p className="text-red-700 font-semibold">⚠️ {error}</p>
          </div>
        )}

        {/* Grocery List Section */}
        {groceryList.length > 0 && (
          <section className="border-2 border-border rounded-3xl p-6 bg-surface shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl text-text font-bold">
                🛒 Your Grocery List
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={selectAllItems}
                  className="px-4 py-2 bg-primary/20 hover:bg-primary/30 border-2 border-border rounded-xl font-semibold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllItems}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 border-2 border-border rounded-xl font-semibold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  Deselect All
                </button>
                <button
                  onClick={downloadGroceryList}
                  className="px-6 py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  Download List
                </button>
              </div>
            </div>
            <div className="mb-4 p-3 bg-secondary/10 border-2 border-border rounded-xl">
              <p className="text-sm text-text-secondary">
                ✓{" "}
                <strong>
                  {Object.values(checkedItems).filter(Boolean).length}
                </strong>{" "}
                of <strong>{groceryList.length}</strong> items selected
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groceryList.map((item, index) => {
                const itemKey = `${item.name}-${item.unit}-${index}`;
                return (
                  <div
                    key={itemKey}
                    className={`flex items-center gap-3 p-3 border-2 border-border rounded-xl hover:shadow-md transition-all cursor-pointer ${
                      checkedItems[itemKey]
                        ? "bg-primary/10"
                        : "bg-muted opacity-60"
                    }`}
                    onClick={() => toggleGroceryItem(itemKey)}
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems[itemKey] || false}
                      readOnly
                      className="w-5 h-5 cursor-pointer accent-primary pointer-events-none"
                    />
                    <span
                      className={`text-text ${
                        checkedItems[itemKey] ? "font-medium" : "line-through"
                      }`}
                    >
                      {formatGroceryItemDisplay(item)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Dashboard */}

        {/* Recipes */}
        <section className="border-2 border-border rounded-3xl bg-surface shadow-lg p-6">
          {/* Search Bar */}
          <div className="flex p-2">
            <h2 className="text-3xl text-text text-center font-bold pr-10">
              Recipes{" "}
            </h2>
            <div className="flex gap-2 ml-auto w-max">
              <label htmlFor="category-select" className="text-text font-semibold self-center">
                Category:
              </label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border-2 border-border rounded-xl bg-surface text-text focus:outline-none focus:border-accent transition-colors min-w-[150px]"
              >
                <option value="">All</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-96 px-4 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="px-6 py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Clear
              </button>
            </div>
          </div>
          {/* Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {isLoadingRecipes ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">🍳</div>
                <p className="text-2xl text-text font-semibold">
                  Loading your recipes...
                </p>
              </div>
            ) : filteredRecipes.length > 0 ? (
              filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.recipe_id}
                  recipe={recipe}
                  isSelected={selectedRecipes.some(
                    (r) => r.recipe_id === recipe.recipe_id,
                  )}
                  onSelect={handleRecipeCheckBoxSelect}
                  onDelete={handleRecipeDelete}
                  onClick={handleRecipeClick}
                />
              ))
            ) : recipes.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-2xl text-text font-semibold mb-2">
                  No recipes yet!
                </p>
                <p className="text-text-secondary">
                  Click "Create Recipe" to add your first recipe
                </p>
              </div>
            ) : (
              <p className="text-text text-center col-span-3">
                No results found for "{searchTerm}"
              </p>
            )}
          </div>
        </section>
      </div>
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
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🍳</div>
            <p className="text-2xl text-text font-semibold">Loading...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
