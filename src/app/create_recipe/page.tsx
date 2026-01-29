"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ErrorPopUp from "@/components/ErrorPopUp";
import CookingTips from "@/components/CookingTips";
import toast from "react-hot-toast";
import { Recipe, Ingredients } from "@/types/types";

/* ---- Current Data Structure that is Returned from API ------
{
  "data": {
    "recipe_id": 0,
    "user_id": 0,
    "user_name": "mwspencer75",
    "is_public": 0,
    "category": "snack",
    "name": "Eggs",
    "servings": 4,
    "per_serving_calories": 0,
    "per_serving_protein_g": 0,
    "per_serving_fat_g": 0,
    "per_serving_carbs_g": 0,
    "per_serving_sugar_g": 0,
    "ingredients_json": [
      {
        "name": "eggs",
        "quantity": 0,
        "unit": "each",
        "prep": "",
        "optional": false,
        "section": ""
      },
      {
        "name": "milk",
        "quantity": 0,
        "unit": "",
        "prep": "original unit unclear",
        "optional": false,
        "section": ""
      }
    ],
    "instructions_json": [
      {
        "step": 1,
        "text": "Mix eggs and milk in a bowl"
      },
      {
        "step": 2,
        "text": "Cook for 4 min on medium heat."
      }
    ],
    "emoji": "🍽️",
    "tags": [
      "snack",
      "eggs"
    ],
    "time": {
      "active_min": 4,
      "total_time": 4
    }
  }
}
*/

export default function CreateRecipe() {
  const [recipeName, setRecipeName] = useState("");
  //const [categories, setCategories] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("snack");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const categories = ["snack", "chicken", "soup", "fish", "breakfast"];
  const numberOfServings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const [selectedNumberOfServings, setSelectedNumberOfServings] = useState(1);
  const [isPublicSelected, setIsPublicSelected] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const genericToastErrorMessage = "Failed to Save Recipe";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);

  // Check for recipe edit data on mount
  useEffect(() => {
    const storedRecipe = sessionStorage.getItem("recipe_edit");
    if (storedRecipe) {
      const recipe: Recipe = JSON.parse(storedRecipe);
      setIsEditMode(true);
      setEditingRecipeId(recipe.recipe_id);
      setRecipeName(recipe.name);
      setSelectedCategory(recipe.category);
      setSelectedNumberOfServings(recipe.servings);
      setIsPublicSelected(recipe.is_public);

      // Convert ingredients_json back to text format
      const ingredientsText = recipe.ingredients_json
        .map((ing) => {
          let line = `${ing.quantity} ${ing.unit} ${ing.name}`;
          if (ing.prep) line += `, ${ing.prep}`;
          if (ing.optional) line += " (optional)";
          return line;
        })
        .join("\n");
      setIngredients(ingredientsText);

      // Convert instructions_json back to text format
      const instructionsText = recipe.instructions_json
        .sort((a, b) => a.step - b.step)
        .map((inst) => `${inst.step}. ${inst.text}`)
        .join("\n");
      setInstructions(instructionsText);

      // Clear the edit data so refreshing doesn't re-populate
      sessionStorage.removeItem("recipe_edit");
    }
  }, []);

  const handleApiError = async (response: Response, toastMessage: string) => {
    // Log full response details for debugging
    console.error("❌ API Error Details:");
    console.error("Status:", response.status, response.statusText);
    console.error("URL:", response.url);

    const errorData = await response.json().catch(() => null);

    // Log the error body
    console.error("Error Body:", errorData);

    setErrorMessage(`Error: ${errorData?.error ?? response.statusText}`);
    toast.error(toastMessage);
  };

  const handleIsPublicSelected = () => {
    console.log("selected: ", isPublicSelected);
    if (isPublicSelected === 0) {
      setIsPublicSelected(1);
    } else {
      setIsPublicSelected(0);
    }
  };

  const handleCancelClick = () => {
    router.push("/dashboard");
  };

  const handleSubmitClick = async () => {
    setIsSubmitting(true);
    const validationErrors: string[] = [];
    try {
      console.log("submitting recipe");
      // ------------------------------------------------------------------
      // -------------- Input Validation ----------------------------------
      // ------------------------------------------------------------------
      if (!recipeName.trim()) {
        validationErrors.push("Recipe Name Missing.");
      }
      if (!selectedCategory.trim()) {
        validationErrors.push("Category not selected.");
      }
      if (!ingredients.trim()) {
        validationErrors.push("Missing ingredients.");
      }
      if (!instructions.trim()) {
        validationErrors.push("Missing instructions.");
      }
      if (validationErrors.length > 0) {
        setErrorMessage(validationErrors.join(" "));
        toast.error(genericToastErrorMessage);
        return;
      }

      // ------------------------------------------------------------------
      // ----------- Creating Recipe JSON ---------------------------------
      // ------------------------------------------------------------------

      // step 0. Set up Variables
      const ingredients_text = ingredients.trim();
      const instructions_text = instructions.trim();
      // step 1. Parallel Validation API Calls - Set up Promise
      const [response_ingredients, response_instructions] = await Promise.all([
        fetch("/api/check-valid-ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ingredients_text }),
        }),
        fetch("/api/check-valid-instructions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructions_text }),
        }),
      ]);
      // step 2. Check the Response - Did API response without Error
      if (!response_ingredients.ok) {
        await handleApiError(
          response_ingredients,
          "Failed to validate ingredients",
        );
        return;
      }
      if (!response_instructions.ok) {
        await handleApiError(
          response_instructions,
          "Failed to validate instructions",
        );
        return;
      }
      // step 3. Parse JSON Reponses
      const [data_ingredients, data_instructions] = await Promise.all([
        response_ingredients.json(),
        response_instructions.json(),
      ]);
      // step 4. Validate the Results from the JSON Responses
      if (!data_ingredients.isIngredients) {
        setErrorMessage("Error: Data is not valid food ingredients");
        toast.error("Invalid ingredients");
        return;
      }
      if (!data_instructions.isInstructions) {
        setErrorMessage("Error: User input is not valid recipe instructions");
        toast.error("Invalid instructions");
        return;
      }
      console.log("Validation successful, creating recipe...");
      // ------------------------------------------------------------------
      // Reformat
      // ------------------------------------------------------------------
      console.log("time to reformat");
      // Call API
      const response_create_recipe = await fetch("/api/create-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeName: recipeName.trim(),
          category: selectedCategory.trim(),
          ingredients: ingredients_text,
          instructions: instructions_text,
        }),
      });

      if (!response_create_recipe.ok) {
        await handleApiError(response_create_recipe, "Failed to Create Recipe");
        return;
      }
      const data_create_recipe = await response_create_recipe.json();
      console.log(
        `This is the recipe Object: ${JSON.stringify(data_create_recipe)}`,
      );

      // Save to sessionStorage (include editing recipe ID if in edit mode)
      const draftData = {
        ...data_create_recipe,
        isEditMode,
        editingRecipeId,
      };
      sessionStorage.setItem("recipe_draft", JSON.stringify(draftData));

      setRecipeName("");
      setSelectedCategory("");
      setIngredients("");
      setInstructions("");
      router.push("/create_recipe_step_two");

      // router.push("/dashboard");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An error occurred with Recipe validation",
      );
      toast.error("Failed to save recipe");
      console.error("Error validating Recipe data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CookingTips isVisible={isSubmitting} />
      <ErrorPopUp message={errorMessage} onClose={() => setErrorMessage("")} />
      <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-5">
        {/* Header Information */}
        <div className="flex justify-center mt-10 mb-10">
          <h1 className="text-4xl text-text font-bold">
            {isEditMode ? "Edit Recipe" : "Create Recipe"}
          </h1>
        </div>

        {/* Name Block */}
        <section className="border-2 border-border rounded-3xl px-10 py-4 bg-surface shadow-lg flex flex-col gap-4">
          <input
            type="text"
            placeholder="Name..."
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="w-full px-2 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
          />
          <select
            onChange={(e) => setSelectedCategory(e.target.value)}
            value={selectedCategory}
            className="w-full px-2 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
          >
            <option value="" disabled>
              Category...
            </option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {/* Number of Servings and isPublic */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-text">Number of Servings:</label>
              <select
                onChange={(e) =>
                  setSelectedNumberOfServings(Number(e.target.value))
                }
                value={selectedNumberOfServings}
                className="px-2 py-2 border-2 border-border rounded-xl bg-surface text-text focus:outline-none focus:border-accent transition-colors"
              >
                {numberOfServings.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-text">Is Public</label>
              <input
                type="checkbox"
                checked={isPublicSelected === 1}
                className="w-5 h-5 cursor-pointer accent-accent"
                onChange={handleIsPublicSelected}
              />
            </div>
          </div>
        </section>
        {/* Ingredient Block */}
        <section className="border-2 border-border rounded-3xl p-2 bg-surface shadow-lg">
          <h2 className="text-text text-xl font-bold ml-10">Ingredients</h2>
          <textarea
            id="ingredients_message"
            className="m-5 block min-h-64 w-9/12 rounded-lg border-2 border-border bg-surface p-2.5 text-sm text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
            placeholder="Ingredients..."
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
          />
        </section>
        {/* Instructions Block */}
        <section className="border-2 border-border rounded-3xl p-2 bg-surface shadow-lg">
          <h2 className="text-text text-xl font-bold ml-10">Instructions</h2>
          <textarea
            id="instructions_message"
            className="m-5 block min-h-64 w-9/12 rounded-lg border-2 border-border bg-surface p-2.5 text-sm text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
            placeholder="Instructions..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </section>
        <div className="flex justify-end">
          <button
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="w-1/3 px-6 py-2 mr-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            {isSubmitting ? "Submitting..." : isEditMode ? "Update" : "Submit"}
          </button>
          <button
            onClick={handleCancelClick}
            className="px-6 w-1/3 py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
