"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ErrorPopUp from "@/components/ErrorPopUp";
import toast from "react-hot-toast";

/* ---- Current Data Structure that is Returned ------
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
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const genericToastErrorMessage = "Failed to Save Recipe";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApiError = async (
    response: Response,
    toastId: string | number,
    toastMessage: string,
  ) => {
    const errorData = await response.json().catch(() => null);
    setErrorMessage(`Error: ${errorData?.error ?? response.statusText}`);
    toast.error(toastMessage, { id: toastId });
  };

  const handleCancelClick = () => {
    router.push("/dashboard");
  };

  const handleSubmitClick = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading("Saving Recipe...");
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
        toast.error(genericToastErrorMessage, { id: toastId });
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
          toastId,
          "Failed to validate ingredients",
        );
        return;
      }
      if (!response_instructions.ok) {
        await handleApiError(
          response_instructions,
          toastId,
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
        toast.error("Invalid ingredients", { id: toastId });
        return;
      }
      if (!data_instructions.isInstructions) {
        setErrorMessage("Error: User input is not valid recipe instructions");
        toast.error("Invalid instructions", { id: toastId });
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
        await handleApiError(
          response_create_recipe,
          toastId,
          "Failed to Create Recipe",
        );
        return;
      }
      const data_create_recipe = await response_create_recipe.json();
      console.log(
        `This is the recipe Object: ${JSON.stringify(data_create_recipe)}`,
      );

      // Insert into DB

      toast.success("Saved successfully", { id: toastId });
      setRecipeName("");
      setSelectedCategory("");
      setIngredients("");
      setInstructions("");
      router.push("/dashboard");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An error occurred with Recipe validation",
      );
      toast.error("Failed to save recipe", { id: toastId });
      console.error("Error validating Recipe data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ErrorPopUp message={errorMessage} onClose={() => setErrorMessage("")} />
      <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-5">
        {/* Header Information */}
        <div className="flex justify-center mt-10 mb-10">
          <h1 className="text-4xl text-text font-bold">Create Recipe</h1>
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
            placeholder="Category..."
            className="w-full px-2 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </section>
        {/* Ingredient Block */}
        <section className="border-2 border-border rounded-3xl p-2 bg-surface shadow-lg">
          <h2 className="text-text text-xl font-bold ml-10">Ingredients</h2>
          <textarea
            id="ingredients_message"
            className="m-5  block min-h-64 w-9/12 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
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
            className="m-5 block min-h-64 w-9/12 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
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
            {isSubmitting ? "Submitting" : "submit"}
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
