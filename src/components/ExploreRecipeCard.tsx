"use client";
import { useState } from "react";
import { ExploreRecipe } from "@/types/types";
import { getCategoryColor } from "@/lib/categoryColors";

type ExploreRecipeCardProps = {
  recipe: ExploreRecipe;
  onAdd: (recipeId: number) => Promise<void>;
  onClick: (recipeId: number) => void;
};

export default function ExploreRecipeCard({
  recipe,
  onAdd,
  onClick,
}: ExploreRecipeCardProps) {
  const [isAdding, setIsAdding] = useState(false);

  const {
    recipe_id,
    category,
    name,
    emoji,
    image_url,
    per_serving_calories,
    per_serving_protein_g,
    per_serving_fat_g,
    creator_name,
    creator_profile_pic,
  } = recipe;

  const categoryColor = getCategoryColor(category || "");

  const handleAddClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    try {
      await onAdd(recipe_id);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      onClick={() => onClick(recipe_id)}
      className="relative w-full h-auto border border-border rounded-2xl mb-4 transition-[filter] hover:brightness-[0.97] cursor-pointer overflow-visible"
      style={{ backgroundColor: categoryColor }}
    >
      {/* Hero photo — or emoji on a subtle tint as a fallback */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl">
        {image_url ? (
          <img
            src={image_url}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/5 text-6xl">
            {emoji || "🍽️"}
          </div>
        )}

        {/* User Profile - top right, over the photo */}
        <div className="absolute top-3 right-3">
          {creator_profile_pic ? (
            <img
              src={creator_profile_pic}
              alt={creator_name}
              className="w-12 h-12 rounded-full border border-border object-cover shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-yellow-200 border border-border flex items-center justify-center text-sm font-bold text-text shadow-sm">
              {creator_name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-3 pb-16">
        {category && (
          <span className="inline-block ml-3 mt-1 text-[11px] uppercase tracking-wider text-text-secondary">
            {category}
          </span>
        )}
        {/* Name */}
        <h2 className="text-xl text-text font-bold m-3">{name}</h2>
        {/* Macros */}
        <h3 className="text-base text-text font-bold ml-3 mr-1 mt-3">
          Macros per Serving
        </h3>
        <p className="text-sm text-text mt-2 ml-3 mr-1">
          Calories: {Math.round(per_serving_calories)}cal
          <br />
          Protein: {Math.round(per_serving_protein_g)}g
          <br />
          Fat: {Math.round(per_serving_fat_g)}g
        </p>
      </div>

      {/* Add Button - bottom right */}
      <div className="absolute bottom-0 right-0">
        <div className="mt-2 mr-3 mb-3">
          <div className="group relative">
            <button
              onClick={handleAddClick}
              disabled={isAdding}
              className="px-6 py-2 bg-primary hover:bg-primary/80 border border-border rounded-xl font-bold text-text transition-colors disabled:opacity-50"
            >
              {isAdding ? "Adding..." : "Add"}
            </button>
            {/* Tooltip */}
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full right-0 mb-2 w-48 sm:w-64 p-3 bg-background border border-border rounded-xl text-sm text-text z-20">
              Click Add to add this recipe to your library, you can then edit
              the recipe to fit your preferences :)
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
