"use client";
import RecipeCard from "@/components/RecipeCard";
import SelectedRecipeCard from "@/components/SelectedRecipeCard";
import { Recipe } from "@/types/types";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [groceryList, setGroceryList] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    fetchRecipes();
  }, [isLoaded, user, router]);

  const filteredRecipes = recipes.filter((recipe) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = recipe.name.toLowerCase().includes(searchLower);
    const ingredientsMatch = recipe.ingredients_json.some((ingredient) => {
      return ingredient.name.toLowerCase().includes(searchLower);
    });
    return nameMatch || ingredientsMatch;
  });

  const handleCreateRecipeClick = () => {
    router.push("/create_recipe");
  };

  const handleRecipeSelect = (recipe: Recipe, isChecked: boolean) => {
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

  const generateGroceryList = async () => {
    if (selectedRecipes.length === 0) {
      setError("Please select at least one recipe first");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Extract ingredient names from selected recipes
      const allIngredients: string[] = [];

      selectedRecipes.forEach((recipe) => {
        recipe.ingredients_json.forEach((ingredient) => {
          // Only add the ingredient name, not quantity or unit
          allIngredients.push(ingredient.name);
        });
      });

      // Simple deduplication - remove exact duplicates
      const uniqueIngredients = Array.from(new Set(allIngredients));

      // Call API to sort ingredients
      const response = await fetch("/api/sort-grocery-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients: uniqueIngredients }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate grocery list");
      }

      const data = await response.json();
      setGroceryList(data.sortedIngredients);

      // Initialize all items as checked (default to true)
      const initialCheckedState: { [key: string]: boolean } = {};
      data.sortedIngredients.forEach((ingredient: string) => {
        initialCheckedState[ingredient] = true;
      });
      setCheckedItems(initialCheckedState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error generating grocery list:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleGroceryItem = (ingredient: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [ingredient]: !prev[ingredient],
    }));
  };

  const selectAllItems = () => {
    const allChecked: { [key: string]: boolean } = {};
    groceryList.forEach((ingredient) => {
      allChecked[ingredient] = true;
    });
    setCheckedItems(allChecked);
  };

  const deselectAllItems = () => {
    const allUnchecked: { [key: string]: boolean } = {};
    groceryList.forEach((ingredient) => {
      allUnchecked[ingredient] = false;
    });
    setCheckedItems(allUnchecked);
  };

  const downloadGroceryList = () => {
    // Only include checked items
    const checkedIngredients = groceryList.filter(
      (ingredient) => checkedItems[ingredient]
    );

    if (checkedIngredients.length === 0) {
      setError("Please select at least one item to download");
      return;
    }

    // Create text file content
    const textContent = checkedIngredients.join("\n");

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

            <button
              onClick={generateGroceryList}
              disabled={isGenerating || selectedRecipes.length === 0}
              className="w-32 bg-secondar hover:bg-secondar/80 border-2 border-border rounded-3xl py-4 mb-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="text-1xl font-bold text-text">
                {isGenerating ? "Generating..." : "Generate List"}
              </span>
            </button>
          </div>
          <button
            className="w-full bg-accent hover:bg-accent/80 border-2 border-border rounded-3xl py-4 shadow-md hover:shadow-lg transition-all"
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
                ✓ <strong>{Object.values(checkedItems).filter(Boolean).length}</strong> of{" "}
                <strong>{groceryList.length}</strong> items selected
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groceryList.map((ingredient, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 border-2 border-border rounded-xl hover:shadow-md transition-all cursor-pointer ${
                    checkedItems[ingredient]
                      ? "bg-primary/10"
                      : "bg-muted opacity-60"
                  }`}
                  onClick={() => toggleGroceryItem(ingredient)}
                >
                  <input
                    type="checkbox"
                    checked={checkedItems[ingredient] || false}
                    readOnly
                    className="w-5 h-5 cursor-pointer accent-primary pointer-events-none"
                  />
                  <span
                    className={`text-text ${
                      checkedItems[ingredient] ? "font-medium" : "line-through"
                    }`}
                  >
                    {ingredient}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Dashboard */}
        <section className="border-2 border-border rounded-3xl p-6 bg-surface shadow-lg">
          <h2 className="text-3xl text-text font-bold mb-6 text-center">
            📊 Your Kitchen Stats
          </h2>
          <div className="flex gap-6">
            {/* Left Side - Nutrition & Stats */}
            <div className="flex-1 space-y-4">
              {/* Quick Stats Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-primary/20 border-2 border-border rounded-2xl p-4 hover:scale-[1.02] transition-transform shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">📖</span>
                    <p className="text-sm text-text-secondary font-semibold">
                      Total Recipes
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-text ml-9">12</p>
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
                <div className="bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 border-4 border-border rounded-full w-72 h-72 shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
                  <div className="text-center">
                    <p className="text-6xl mb-2">📈</p>
                    <p className="text-text-secondary font-semibold">
                      Chart Coming Soon
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Recipes */}
        <section className="border-2 border-border rounded-3xl bg-surface shadow-lg p-6">
          {/* Search Bar */}
          <div className="flex p-2">
            <h2 className="text-3xl text-text text-center font-bold pr-10">
              Recipes{" "}
            </h2>
            <div className="flex gap-2 ml-auto w-max">
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
          <div className="flex flex-col justify-center w-full mt-5 border-2 border-border rounded-2xl bg-surface">
            <h2 className="text-3xl text-text text-left font-bold ml-5 mt-5 mb-5">
              Recipes
            </h2>
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
                    onSelect={handleRecipeSelect}
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
          </div>
        </section>
      </div>
    </div>
  );
}
