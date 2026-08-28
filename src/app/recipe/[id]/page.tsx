"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Recipe, Ingredients } from "@/types/types";
import toast from "react-hot-toast";
import RecipePhoto from "@/components/RecipePhoto";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(
    new Set(),
  );
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const fromExplore = searchParams.get("from") === "explore";

  const toggleIngredient = (key: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleStep = (step: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  useEffect(() => {
    // Reset cooking progress when switching recipes
    setCheckedIngredients(new Set());
    setCheckedSteps(new Set());

    const fetchRecipe = async () => {
      try {
        const response = await fetch(`/api/recipes/${params.id}`);
        if (!response.ok) {
          throw new Error("Recipe not found");
        }
        const data = await response.json();
        setRecipe(data.recipe);
        setIsOwner(data.isOwner);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recipe");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRecipe();
    }
  }, [params.id]);

  const handleAddRecipe = async () => {
    if (!recipe) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.recipe_id}/add`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add recipe");
      }

      toast.success("Recipe added to your collection!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add recipe");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBack = () => {
    if (fromExplore) {
      router.push("/explore_recipes");
    } else {
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-2xl text-text-secondary animate-pulse">
          Loading recipe...
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-2xl text-accent">
          {error || "Recipe not found"}
        </div>
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-primary hover:bg-primary/80 border border-border rounded-xl font-bold text-text transition-all"
        >
          {fromExplore ? "Back to Explore" : "Back to Dashboard"}
        </button>
      </div>
    );
  }

  // Group ingredients by section
  const ingredientsBySection = recipe.ingredients_json.reduce(
    (acc, ing) => {
      const section = ing.section || "Main";
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(ing);
      return acc;
    },
    {} as Record<string, Ingredients[]>,
  );

  return (
    <div className="min-h-screen bg-background py-6 px-4 print:py-2 print:px-4">
      <div className="max-w-5xl mx-auto">
        {/* Recipe Card */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden print:shadow-none print:border">
          {/* Header with decorative top border */}
          <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2 print:h-1" />

          {/* Side-by-side header: photo | title, meta & macros */}
          <div
            className={`border-b border-border/50 border-dashed print:block ${
              recipe.image_url || isOwner
                ? "sm:grid sm:grid-cols-[300px_1fr]"
                : ""
            }`}
          >
            {/* Photo column — only when a photo exists or the owner can add one */}
            {(recipe.image_url || isOwner) && (
              <div className="border-b sm:border-b-0 sm:border-r border-border/50 print:hidden">
                <RecipePhoto
                  recipeId={recipe.recipe_id}
                  imageUrl={recipe.image_url}
                  name={recipe.name}
                  isOwner={isOwner}
                  onChange={(url) =>
                    setRecipe((r) => (r ? { ...r, image_url: url } : r))
                  }
                />
              </div>
            )}

            {/* Text column */}
            <div className="px-5 py-4 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="text-4xl">{recipe.emoji || "🍽️"}</span>
                <h1 className="text-3xl font-bold text-text">{recipe.name}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-text-secondary text-sm">
                <span className="px-2 py-0.5 bg-muted rounded-full">
                  {recipe.category}
                </span>
                <span className="px-2 py-0.5 bg-muted rounded-full">
                  {recipe.servings} servings
                </span>
                {recipe.time.active_min > 0 && (
                  <span className="px-2 py-0.5 bg-muted rounded-full">
                    👩‍🍳 {recipe.time.active_min}m
                  </span>
                )}
                {recipe.time.total_time > 0 && (
                  <span className="px-2 py-0.5 bg-muted rounded-full">
                    ⏱️ {recipe.time.total_time}m
                  </span>
                )}
              </div>
              {/* Show creator info if viewing someone else's recipe */}
              {!isOwner && (
                <p className="text-sm text-text-secondary mt-2">
                  Created by {recipe.user_name}
                </p>
              )}
              {/* Macros */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-base">
                <span className="font-medium text-text">
                  <span className="text-accent">
                    {recipe.per_serving_calories}
                  </span>{" "}
                  cal
                </span>
                <span className="text-border">|</span>
                <span className="font-medium text-text">
                  <span className="text-primary">
                    {recipe.per_serving_protein_g}g
                  </span>{" "}
                  protein
                </span>
                <span className="text-border">|</span>
                <span className="font-medium text-text">
                  <span className="text-secondary">
                    {recipe.per_serving_carbs_g}g
                  </span>{" "}
                  carbs
                </span>
                <span className="text-border">|</span>
                <span className="font-medium text-text">
                  <span className="text-primary">
                    {recipe.per_serving_fat_g}g
                  </span>{" "}
                  fat
                </span>
                {recipe.per_serving_sugar_g > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className="font-medium text-text">
                      <span className="text-accent">
                        {recipe.per_serving_sugar_g}g
                      </span>{" "}
                      sugar
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Two Column Layout for Ingredients & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-0 print:min-h-[8.5in]">
            {/* Ingredients Section */}
            <div className="px-4 py-3 border-t border-r-0 sm:border-r print:border-r border-border/50">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-2xl">🥗</span>
                <h2 className="text-2xl font-bold text-text">Ingredients</h2>
              </div>
              <div className="space-y-5">
                {Object.entries(ingredientsBySection).map(
                  ([section, ingredients]) => (
                    <div key={section}>
                      {Object.keys(ingredientsBySection).length > 1 && (
                        <h3 className="text-base font-semibold text-text-secondary uppercase tracking-wide mb-1 pl-1.5 border-l border-secondary">
                          {section}
                        </h3>
                      )}
                      <ul className="space-y-0.5">
                        {ingredients.map((ing, idx) => {
                          const key = `${section}-${idx}`;
                          const isChecked = checkedIngredients.has(key);
                          return (
                            <li key={idx}>
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={isChecked}
                                onClick={() => toggleIngredient(key)}
                                className={`flex items-start gap-2 text-xl text-left w-full py-0.5 rounded hover:bg-muted/40 transition-colors print:hover:bg-transparent print:opacity-100 ${ing.optional ? "opacity-70" : ""} ${isChecked ? "opacity-50" : ""}`}
                              >
                                <span
                                  className={`w-5 h-5 rounded border flex-shrink-0 mt-1 flex items-center justify-center transition-colors print:border-primary ${isChecked ? "bg-primary border-primary" : "bg-primary/10 border-primary/40"}`}
                                >
                                  {isChecked && (
                                    <span className="text-white text-sm leading-none font-bold">
                                      ✓
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`text-text ${isChecked ? "line-through" : ""}`}
                                >
                                  <span className="font-medium">
                                    {ing.quantity} {ing.unit}
                                  </span>{" "}
                                  {ing.name}
                                  {ing.prep && (
                                    <span className="text-text-secondary text-base">
                                      , {ing.prep}
                                    </span>
                                  )}
                                  {ing.optional && (
                                    <span className="text-text-secondary text-base">
                                      {" "}
                                      (opt)
                                    </span>
                                  )}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Instructions Section */}
            <div className="px-4 py-3 border-t border-border/50 bg-muted/10">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-2xl">📝</span>
                <h2 className="text-2xl font-bold text-text">Instructions</h2>
              </div>
              <ol className="space-y-2">
                {recipe.instructions_json
                  .sort((a, b) => a.step - b.step)
                  .map((instruction) => {
                    const isChecked = checkedSteps.has(instruction.step);
                    return (
                      <li key={instruction.step}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isChecked}
                          onClick={() => toggleStep(instruction.step)}
                          className={`flex gap-2 w-full text-left py-0.5 rounded hover:bg-muted/40 transition-colors print:hover:bg-transparent print:opacity-100 ${isChecked ? "opacity-50" : ""}`}
                        >
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-lg font-bold transition-colors ${isChecked ? "bg-primary border-primary text-white" : "bg-secondary/30 border-secondary/50 text-text"}`}
                          >
                            {instruction.step}
                          </div>
                          <p
                            className={`text-text text-xl leading-normal ${isChecked ? "line-through" : ""}`}
                          >
                            {instruction.text}
                          </p>
                        </button>
                      </li>
                    );
                  })}
              </ol>
            </div>
          </div>

          {/* Footer with decorative border */}
          <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2 print:h-1" />
        </div>

        {/* Buttons - Hidden on print */}
        <div className="flex justify-center gap-4 mt-4 print:hidden">
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-surface hover:bg-muted border border-border rounded-xl font-bold text-text transition-all"
          >
            Back
          </button>

          {isOwner ? (
            <button
              onClick={() => {
                sessionStorage.setItem("recipe_edit", JSON.stringify(recipe));
                router.push("/create_recipe");
              }}
              className="px-6 py-2 bg-primary hover:bg-primary/80 border border-border rounded-xl font-bold text-text transition-all"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={handleAddRecipe}
              disabled={isAdding}
              className="px-6 py-2 bg-accent hover:bg-accent/80 border border-border rounded-xl font-bold text-text transition-all disabled:opacity-50"
            >
              {isAdding ? "Adding..." : "Add to My Recipes"}
            </button>
          )}
        </div>

        {/* Print footer */}
        <div className="hidden print:block text-center mt-2 text-text-secondary text-xs">
          Made with Let Em Cook
        </div>
      </div>
    </div>
  );
}
