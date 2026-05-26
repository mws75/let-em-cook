"use client";
import React, { useState } from "react";
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
  onFavoriteToggle?: (recipeId: number, isFavorite: 0 | 1) => void;
};

export default function RecipeCard({
  recipe,
  isSelected,
  onSelect,
  onDelete,
  onClick,
  onFavoriteToggle,
}: RecipeCardProps) {
  const {
    recipe_id,
    category,
    name,
    per_serving_calories,
    per_serving_protein_g,
    per_serving_fat_g,
    per_serving_carbs_g,
    is_favorite,
  } = recipe;

  const categoryColor = getCategoryColor(category || "");
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

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

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTogglingFavorite) return;
    const nextIsFavorite = is_favorite === 1 ? 0 : 1;

    // Optimistic — parent updates state immediately; we roll back on error.
    setIsTogglingFavorite(true);
    onFavoriteToggle?.(recipe_id, nextIsFavorite);
    try {
      const response = await fetch(`/api/recipes/${recipe_id}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: nextIsFavorite === 1 }),
      });
      if (!response.ok) {
        throw new Error("Failed to update favorite");
      }
    } catch (error) {
      console.error("API favorite error", error);
      toast.error("Could not update favorite");
      // Roll back
      onFavoriteToggle?.(recipe_id, is_favorite);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  return (
    <div
      className="group relative rounded-2xl border border-border p-4 transition duration-150 hover:brightness-[0.97] hover:shadow-sm"
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

      <div className="flex justify-between items-center mt-3">
        <button
          onClick={handleFavoriteClick}
          disabled={isTogglingFavorite}
          className="p-1.5 rounded-full text-text-secondary hover:bg-black/5 transition-colors disabled:opacity-50"
          aria-label={
            is_favorite === 1 ? "Remove from favorites" : "Add to favorites"
          }
          aria-pressed={is_favorite === 1}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill={is_favorite === 1 ? "#facc15" : "none"}
            stroke={is_favorite === 1 ? "#ca8a04" : "currentColor"}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
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
