"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ErrorPopUp from "@/components/ErrorPopUp";
import toast from "react-hot-toast";

export default function CreateRecipe() {
  const [recipeName, setRecipeName] = useState("");
  //const [categories, setCategories] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const categories = ["snack", "chicken", "soup", "fish", "breakfast"];
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const genericToastErrorMessage = "Failed to Save Recipe";
  const handleCancelClick = () => {
    router.push("/dashboard");
  };

  const handleSubmitClick = async () => {
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
        setErrors(validationErrors);
        toast.error(genericToastErrorMessage, { id: toastId });
        return;
      }

      // ------------------------------------------------------------------
      // ------------ Checking Ingredients --------------------------------
      // ------------------------------------------------------------------
      const ingredients_text = ingredients.trim();
      // Check Ingredients
      const response_ingredients = await fetch("/api/check-valid-ingredients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients_text }),
      });
      // Check API Ran Successsfully
      if (!response_ingredients.ok) {
        const errorData = await response_ingredients.json().catch(() => null);
        setErrorMessage(
          `Error: ${errorData.error ?? response_ingredients.statusText}`,
        );
        toast.error(genericToastErrorMessage, { id: toastId });
        return;
      }

      // Check the Data from the API Response
      const data_ingredients = await response_ingredients.json();

      if (data_ingredients.isIngredients) {
        console.log(
          `User Input for Ingredients is ${JSON.stringify(data_ingredients.isIngredients)}`,
        );
      } else {
        setErrorMessage(`User input is not valid food ingredients`);
        toast.error(genericToastErrorMessage, { id: toastId });
        return;
      }
      // ------------------------------------------------------------------
      // ---------- Checking Instructions ---------------------------------
      // ------------------------------------------------------------------
      console.log("checking instructions");
      // Check Instructions
      const instructions_text = instructions.trim();
      // get response
      const response_instructions = await fetch(
        "/api/check-valid-instructions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ instructions_text }),
        },
      );

      // Check that API returned a response
      if (!response_instructions.ok) {
        const errorData = await response_instructions.json().catch(() => null);
        setErrorMessage(
          `Error: ${errorData.error ?? response_instructions.statusText}`,
        );
        toast.error(genericToastErrorMessage, { id: toastId });
        return;
      }
      // Check the data from API response
      const data_instructions = await response_instructions.json();
      console.log(`data instructions: ${data_instructions}`);

      if (data_instructions.isInstructions) {
        console.log(
          `User Input for Instructions is ${JSON.stringify(data_instructions.isInstructions)}`,
        );
      } else {
        setErrorMessage(`User input is not valid recipe instructions`);
        toast.error(genericToastErrorMessage, { id: toastId });
        return;
      }
      // ------------------------------------------------------------------
      // ----------- Creating Recipe JSON ---------------------------------
      // ------------------------------------------------------------------
      // Reformat
      console.log("time to reformat");
      // combine text

      const full_recipe_text =
        recipeName.trim() +
        "|" +
        selectedCategory.trim() +
        "|" +
        ingredients_text +
        "|" +
        instructions_text;

      // Call API
      const response_create_recipe = await fetch("/api/create-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ full_recipe_text }),
      });

      if (!response_create_recipe.ok) {
        const errorData = await response_create_recipe.json().catch(() => null);
        setErrorMessage(
          `Error: ${errorData.error ?? response_create_recipe.statusText}`,
        );
        toast.error(genericToastErrorMessage, { id: toastId });
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
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An error occurred with Recipe validation",
      );
      console.error("Error validating Recipe data");
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
            className="!m-5  block min-h-64 w-9/12 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
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
            className="!important m-5 block min-h-64 w-9/12 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="Instructions..."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </section>
        <div className="flex justify-end">
          <button
            onClick={handleSubmitClick}
            className="w-1/3 px-6 py-2 mr-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            submit
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
