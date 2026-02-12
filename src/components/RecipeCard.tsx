"use client";
import React from "react";
import Link from "next/link";
import type { Recipe } from "@/types/types";
import toast from "react-hot-toast";

type RecipeCardProps = {
  recipe: Recipe;
  isSelected?: boolean;
  onSelect?: (recipe: Recipe, isChecked: boolean) => void;
  onDelete?: (recipeId: number) => void;
};

export default function RecipeCard({
  recipe,
  isSelected,
  onSelect,
  onDelete,
}: RecipeCardProps) {
  /*const [recipeName, setRecipeName] = useState("Recipe 1");*/
  const {
    recipe_id,
    user_name,
    category,
    name,
    servings,
    per_serving_calories,
    per_serving_protein_g,
    per_serving_fat_g,
    per_serving_carbs_g,
    per_serving_sugar_g,
    ingredients_json,
    instructions_json,
  } = recipe;

  const allIngredients = ingredients_json
    .map((ing) => `${ing.quantity} ${ing.unit} ${ing.name}`)
    .join("\n");

  const handleRecipeCheckBoxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (onSelect) {
      onSelect(recipe, event.target.checked);
    }
  };

  const handleDeleteClick = async () => {
    const toastId = toast.loading("deleting recipe");
    console.log("deleting recipe");
    try {
      const response = await fetch(`/api/recipes/${recipe.recipe_id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }
      toast.success("Recipe Deleted", { id: String(toastId) });
      if (onDelete) {
        onDelete(recipe.recipe_id);
      }
    } catch (error) {
      console.error("API Delete error", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to Delete Recipe";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="relative w-70 h-55 border-2 border-border rounded-2xl bg-surface shadow-lg ml-2 mr-5 mb-5 hover:shadow-xl hover:scale-[1.01] transition-all">
      {/* Checkbox - positioned absolutely so it doesn't interfere with link */}
      <input
        type="checkbox"
        checked={isSelected || false}
        className="absolute top-3 right-3 w-7 h-7 cursor-pointer accent-accent z-10"
        onChange={handleRecipeCheckBoxChange}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Clickable area - links to recipe detail */}
      <Link href={`/recipe/${recipe_id}`} className="block">
        <div className="pt-3 pb-16">
          <h2 className="text-xl text-text font-bold m-3 pr-10">{name}</h2>
          <div>
            <h3 className="text-base text-text font-bold ml-3 mr-1 mt-3">
              Nutrition
            </h3>
            <p className="text-sm text-text mt-2 ml-3 mr-1">
              calories:{per_serving_calories}
              <br />
              protein:{per_serving_protein_g}g <br />
              fat:{per_serving_fat_g}g <br />
              carbs:{per_serving_carbs_g}g<br />
            </p>
          </div>
        </div>
      </Link>

      {/* Buttons - positioned absolutely at bottom */}
      <div className="flex absolute bottom-0 right-0">
        <div className="mt-2 mr-3 mb-3">
          <button
            onClick={handleDeleteClick}
            className="p-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl shadow-md hover:shadow-lg hover:scale-[1.1] transition-all"
            aria-label="Delete recipe"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 64 64"
              className="w-7 h-7"
              fill="none"
            >
              {/* Lid */}
              <rect x="14" y="12" width="36" height="6" rx="3" fill="#4a5568" />
              {/* Lid handle */}
              <rect x="25" y="7" width="14" height="7" rx="3.5" fill="#4a5568" />
              {/* Body */}
              <path
                d="M16 18h32l-3 36a4 4 0 0 1-4 3.5H23A4 4 0 0 1 19 54Z"
                fill="#4a5568"
              />
              {/* Lines on body */}
              <line x1="27" y1="26" x2="27" y2="48" stroke="#fdfbf7" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="37" y1="26" x2="37" y2="48" stroke="#fdfbf7" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
