"use client";
import React from "react";
import type { Recipe } from "@/types/types";
import { getCategoryColor } from "@/lib/categoryColors";
import toast from "react-hot-toast";
// See https://www.byte-size-tech.com/post/221 for Example of CheckBoxs
type RecipeCardProps = {
  recipe: Recipe;
  isSelected?: boolean;
  onSelect?: (recipe: Recipe, isChecked: boolean) => void;
  onDelete?: (recipeId: number) => void;
  onClick?: (recipeId: number) => void;
};

export default function RecipeCard({
  recipe,
  isSelected,
  onSelect,
  onDelete,
  onClick,
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
    if (!window.confirm("Are you sure you want to delete this recipe?")) {
      return;
    }
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
      className="group relative rounded-2xl border border-border p-4 transition-[filter] hover:brightness-[0.97]"
      style={{ backgroundColor: categoryColor }}
    >
      <input
        type="checkbox"
        checked={isSelected || false}
        className="absolute top-3 right-3 w-5 h-5 cursor-pointer accent-primary z-10"
        onChange={handleRecipeCheckBoxChange}
        onClick={(e) => e.stopPropagation()}
      />
      <div
        className="block cursor-pointer pr-7"
        onClick={() => onClick?.(recipe_id)}
      >
        {category && (
          <span className="inline-block mb-2 text-[11px] uppercase tracking-wider text-text-secondary">
            {category}
          </span>
        )}
        <h2 className="text-base text-text font-semibold truncate">{name}</h2>
        <div className="flex gap-3 mt-2 text-xs text-text-secondary">
          <span>{per_serving_calories} cal</span>
          <span>{per_serving_protein_g}g P</span>
          <span>{per_serving_fat_g}g F</span>
          <span>{per_serving_carbs_g}g C</span>
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={handleDeleteClick}
          className="p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-black/5 transition-colors"
          aria-label="Delete recipe"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
