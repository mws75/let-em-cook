"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ErrorPopUp from "@/components/ErrorPopUp";

export default function CreateRecipe() {
  const [recipeName, setRecipeName] = useState("");
  //const [categories, setCategories] = useState("");
  const [selectedCategorty, setSelectedCategory] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const categories = ["snack", "chicken", "soup", "fish", "breakfast"];
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleCancelClick = () => {
    router.push("/dashboard");
  };

  const handleSubmitClick = async () => {
    try {
      console.log("submitting recipe");
      const ingredients_text = ingredients.trim();
      // Check Formatting
      const response = await fetch("api/check-valid-ingredients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients_text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setErrorMessage(`Error: ${errorData.error ?? response.StatusText}`);
        return;
      }

      if (data.IsIngredients) {
        // Data looks good proceed
        console.log(`User Input for Ingredients ${IsIngredients}`);
      } else {
        // Show use error message
      }

      // Reformat

      // Insert into DB
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occured with ingedient validation",
      );
      console.error("Error validating data");
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
            className="w-full px-2 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transistion-colors"
          />
          <select className="w-full px-2 py-2 border-2 border-border rounded-xl bg-surface text-text placeholder-text-secondary focus:outline-none focus:border-accent transistion-colors">
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
            id="message"
            className="!important m-5  block min-h-64 w-9/12 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="Ingredients..."
            value={instructions}
          />
        </section>
        {/* Instructions Block */}
        <section className="border-2 border-border rounded-3xl p-2 bg-surface shadow-lg">
          <h2 className="text-text text-xl font-bold ml-10">Instructions</h2>
          <textarea
            id="message"
            className="!important m-5 block min-h-64 w-9/12 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="Instructions..."
            value={instructions}
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
