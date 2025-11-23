"use client";
import { useState } from "react";

export default function CreateRecipe() {
  const [recipeName, setRecipeName] = useState("");
  //const [categories, setCategories] = useState("");
  const [selectedCategorty, setSelectedCategory] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const categories = ["snack", "chicken", "soup", "fish", "breakfast"];

  return (
    <div className="min-h-screen bg-background">
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
            className="!important m-5  block min-h-[80%] w-9/12 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="Ingredients..."
            value={instructions}
          />
        </section>
        {/* Instructions Block */}
        <section className="border-2 border-border rounded-3xl p-2 bg-surface shadow-lg">
          <h2 className="text-text text-xl font-bold ml-10">Instructions</h2>
          <textarea
            id="message"
            className="!important m-5  block min-h-[80%] w-9/12 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="Instructions..."
            value={instructions}
          />
        </section>
      </div>
    </div>
  );
}
