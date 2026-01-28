"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Recipe, Ingredients } from "@/types/types";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await fetch(`/api/recipes/${params.id}`);
        if (!response.ok) {
          throw new Error("Recipe not found");
        }
        const data = await response.json();
        setRecipe(data.recipe);
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
          onClick={() => router.push("/dashboard")}
          className="px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          Back to Dashboard
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
      <div className="max-w-xl mx-auto">
        {/* Recipe Card */}
        <div className="bg-surface border-2 border-border rounded-2xl shadow-xl overflow-hidden print:shadow-none print:border">
          {/* Header with decorative top border */}
          <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2 print:h-1" />

          {/* Title Section */}
          <div className="px-5 pt-3 pb-2 text-center border-b border-border/50 border-dashed">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">{recipe.emoji || "🍽️"}</span>
              <h1 className="text-xl font-bold text-text">{recipe.name}</h1>
            </div>
            <div className="flex items-center justify-center gap-3 mt-1 text-text-secondary text-xs">
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
          </div>

          {/* Macros Section - Inline */}
          <div className="px-5 py-2 bg-muted/30 flex items-center justify-center gap-4 text-xs">
            <span className="font-medium text-text">
              <span className="text-accent">{recipe.per_serving_calories}</span>{" "}
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
              <span className="text-primary">{recipe.per_serving_fat_g}g</span>{" "}
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

          {/* Two Column Layout for Ingredients & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-0 print:min-h-[8.5in]">
            {/* Ingredients Section */}
            <div className="px-4 py-3 border-t border-r-0 sm:border-r print:border-r border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">🥗</span>
                <h2 className="text-sm font-bold text-text">Ingredients</h2>
              </div>
              <div className="space-y-5">
                {Object.entries(ingredientsBySection).map(
                  ([section, ingredients]) => (
                    <div key={section}>
                      {Object.keys(ingredientsBySection).length > 1 && (
                        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 pl-1.5 border-l-2 border-secondary">
                          {section}
                        </h3>
                      )}
                      <ul className="space-y-0.5">
                        {ingredients.map((ing, idx) => (
                          <li
                            key={idx}
                            className={`flex items-start gap-2 text-sm ${ing.optional ? "opacity-70" : ""}`}
                          >
                            <span className="w-3 h-3 rounded-full bg-primary/20 border border-primary/40 flex-shrink-0 mt-1 print:border-primary" />
                            <span className="text-text">
                              <span className="font-medium">
                                {ing.quantity} {ing.unit}
                              </span>{" "}
                              {ing.name}
                              {ing.prep && (
                                <span className="text-text-secondary text-xs">
                                  , {ing.prep}
                                </span>
                              )}
                              {ing.optional && (
                                <span className="text-text-secondary text-xs">
                                  {" "}
                                  (opt)
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* Instructions Section */}
            <div className="px-4 py-3 border-t border-border/50 bg-muted/10">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">📝</span>
                <h2 className="text-sm font-bold text-text">Instructions</h2>
              </div>
              <ol className="space-y-2">
                {recipe.instructions_json
                  .sort((a, b) => a.step - b.step)
                  .map((instruction) => (
                    <li key={instruction.step} className="flex gap-2">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary/30 border border-secondary/50 flex items-center justify-center text-xs font-bold text-text">
                        {instruction.step}
                      </div>
                      <p className="text-text text-sm leading-snug">
                        {instruction.text}
                      </p>
                    </li>
                  ))}
              </ol>
            </div>
          </div>

          {/* Footer with decorative border */}
          <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2 print:h-1" />
        </div>

        {/* Buttons - Hidden on print */}
        <div className="flex justify-center gap-4 mt-4 print:hidden">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 bg-surface hover:bg-muted border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            Back
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem("recipe_edit", JSON.stringify(recipe));
              router.push("/create_recipe");
            }}
            className="px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            Edit
          </button>
        </div>

        {/* Print footer */}
        <div className="hidden print:block text-center mt-2 text-text-secondary text-xs">
          Made with Let Em Cook
        </div>
      </div>
    </div>
  );
}
