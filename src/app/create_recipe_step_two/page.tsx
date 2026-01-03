"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import EditIngredient from "@/components/EditIngredient";
import { Recipe, Ingredients } from "@/types/types";

export default function CreateRecipeStepTwo() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredientsList, setIngredientsList] = useState<Ingredients[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get the stored recipe
    const storedRecipe = sessionStorage.getItem("recipe_draft");

    if (storedRecipe) {
      const parsedRecipe = JSON.parse(storedRecipe);
      setRecipe(parsedRecipe.data);
      setIngredientsList(parsedRecipe.data.ingredients_json);
    } else {
      console.log("No Recipe data found");
      router.push("/create_recipe");
    }

    setIsLoading(false);
  }, [router]);

  const handleIngredientsUpdate = (updatedIngredients: Ingredients[]) => {
    setIngredientsList(updatedIngredients);
    // TODO: Update the recipe object with new ingredients
  };

  const handleSaveRecipe = () => {
    // Save Updated object
    // Calculate Macros
    // TODO: Insert recipe into database
    toast.success("Recipe saved!");
    router.push("/dashboard");
  };

  const handleCancel = () => {
    sessionStorage.removeItem("recipe_draft");
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="border-2 border-border rounded-3xl p-8 bg-surface shadow-lg">
          <p className="text-2xl text-text font-bold">
            Loading your recipe... 🍳
          </p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-5">
        {/* Header */}
        <div className="flex justify-center mt-10 mb-10">
          <h1 className="text-4xl text-text font-bold">
            🥕 Clean Up Ingredients
          </h1>
        </div>

        {/* Recipe Info Card */}
        <section className="border-2 border-border rounded-3xl px-10 py-6 bg-surface shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl text-text font-bold mb-2">
                {recipe.emoji} {recipe.name}
              </h2>
              <p className="text-text-secondary">
                Category: {recipe.category} • Servings: {recipe.servings}
              </p>
            </div>
          </div>
        </section>

        {/* Ingredients Editor Section */}
        <section className="border-2 border-border rounded-3xl p-6 bg-surface shadow-lg">
          <h2 className="text-2xl text-text font-bold mb-6 flex items-center gap-2">
            <span>🛒</span>
            Review & Edit Ingredients
          </h2>
          <EditIngredient
            ingredients={ingredientsList}
            onChange={handleIngredientsUpdate}
          />
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-6 py-3 bg-muted hover:bg-muted/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveRecipe}
            className="px-8 py-3 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            Save Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
