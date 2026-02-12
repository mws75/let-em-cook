"use client";
import React from "react";
import Link from "next/link";
import type { Recipe } from "@/types/types";
import { getCategoryColor } from "@/lib/categoryColors";
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
  const {
    recipe_id,
    category,
    name,
    per_serving_calories,
    per_serving_protein_g,
    per_serving_fat_g,
    per_serving_carbs_g,
  } = recipe;

  const categoryColor = getCategoryColor(category || "");

  const handleRecipeCheckBoxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (onSelect) {
      onSelect(recipe, event.target.checked);
    }
  };

  const handleDeleteClick = async () => {
    const toastId = toast.loading("deleting recipe");
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
    <div
      className="relative rounded-2xl border-2 border-border shadow-md p-3 hover:shadow-lg hover:scale-[1.01] transition-all"
      style={{
        background: "#ffffff",
        boxShadow: `inset 0 0 20px 8px ${categoryColor}`,
      }}
    >
      <input
        type="checkbox"
        checked={isSelected || false}
        className="absolute top-2 right-2 w-6 h-6 cursor-pointer accent-accent z-10"
        onChange={handleRecipeCheckBoxChange}
        onClick={(e) => e.stopPropagation()}
      />

      <Link href={`/recipe/${recipe_id}`} className="block">
        <h2 className="text-base text-text font-bold pr-8 truncate">{name}</h2>
        <div className="flex gap-3 mt-2 text-xs text-text-secondary">
          <span>{per_serving_calories} cal</span>
          <span>{per_serving_protein_g}g P</span>
          <span>{per_serving_fat_g}g F</span>
          <span>{per_serving_carbs_g}g C</span>
        </div>
      </Link>

      <div className="flex justify-end mt-2">
        <button
          onClick={handleDeleteClick}
          className="p-1.5 bg-background hover:bg-background/80 border-2 border-border rounded-xl shadow-md hover:shadow-lg hover:scale-[1.1] transition-all"
          aria-label="Delete recipe"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            className="w-5 h-5"
            fill="none"
          >
            <rect x="14" y="12" width="36" height="6" rx="3" fill="#4a5568" />
            <rect x="25" y="7" width="14" height="7" rx="3.5" fill="#4a5568" />
            <path
              d="M16 18h32l-3 36a4 4 0 0 1-4 3.5H23A4 4 0 0 1 19 54Z"
              fill="#4a5568"
            />
            <line
              x1="27"
              y1="26"
              x2="27"
              y2="48"
              stroke="#fdfbf7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="37"
              y1="26"
              x2="37"
              y2="48"
              stroke="#fdfbf7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
