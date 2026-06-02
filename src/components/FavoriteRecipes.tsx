"use client";
import RecipeCard from "@/components/RecipeCard";
import type { Recipe } from "@/types/types";
import { Star } from "lucide-react";

type FavoriteRecipesProps = {
  recipes: Recipe[];
  selectedRecipes: Recipe[];
  onSelect: (recipe: Recipe, isChecked: boolean) => void;
  onDelete: (recipeId: number) => void;
  onClick: (recipeId: number) => void;
  onFavoriteToggle: (recipeId: number, isFavorite: 0 | 1) => void;
};

/**
 * Dashboard "Favorites" section. Pulls is_favorite === 1 recipes out of the
 * full `recipes` list (passed in by the parent so we share one source of
 * truth) and renders them with the same RecipeCard used in the main grid —
 * so checkbox selection still feeds into the meal-plan / grocery-list flow.
 */
export default function FavoriteRecipes({
  recipes,
  selectedRecipes,
  onSelect,
  onDelete,
  onClick,
  onFavoriteToggle,
}: FavoriteRecipesProps) {
  const favorites = recipes.filter((r) => r.is_favorite === 1);

  if (favorites.length === 0) {
    return (
      <section className="border border-border rounded-2xl sm:rounded-3xl bg-surface p-3 sm:p-6">
        <h2 className="text-2xl sm:text-3xl text-text font-bold mb-3">
          <span className="flex items-center gap-2"><Star size={22} className="text-yellow-400" />Favorites</span>
        </h2>
        <p className="text-sm text-text-secondary">
          Star a recipe below to pin it here for quick access.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-border rounded-2xl sm:rounded-3xl bg-surface p-3 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
        <h2 className="text-2xl sm:text-3xl text-text font-bold">
          <span className="flex items-center gap-2"><Star size={22} className="text-yellow-400" />Favorites</span>
        </h2>
        <span className="text-sm text-text-secondary">
          {favorites.length} {favorites.length === 1 ? "recipe" : "recipes"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-1 sm:p-2">
        {favorites.map((recipe) => (
          <RecipeCard
            key={recipe.recipe_id}
            recipe={recipe}
            isSelected={selectedRecipes.some(
              (r) => r.recipe_id === recipe.recipe_id,
            )}
            onSelect={onSelect}
            onDelete={onDelete}
            onClick={onClick}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>
    </section>
  );
}
