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
            className="px-6 py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
          >
            delete
          </button>
        </div>
      </div>
    </div>
  );
}
