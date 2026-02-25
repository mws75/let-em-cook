import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Recipe, Ingredients } from "@/types/types";
import toast from "react-hot-toast";

type RecipeDetailModalProps = {
  recipeId: number;
  onCloseClick: () => void;
  onDelete: (recipeId: number) => void;
};

export default function RecipeDetailModal({
  recipeId,
  onCloseClick,
  onDelete,
}: RecipeDetailModalProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await fetch(`/api/recipes/${recipeId}`);
        if (!response.ok) {
          throw new Error("Recipe not found");
        }
        const data = await response.json();
        setRecipe(data.recipe);
        setIsOwner(data.isOwner);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Recipe");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseClick();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCloseClick]);

  // Prevent Body Scrolling when background is moving
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleDeleteClick = async () => {
    const toastId = toast.loading("deleting recipe");
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }
      toast.success("Recipe Deleted", { id: String(toastId) });
      if (onDelete) {
        onDelete(recipeId);
      }
    } catch (error) {
      console.error("API Delete error", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to Delete Recipe";
      toast.error(errorMessage);
    } finally {
      router.push("/dashboard");
    }
  };

  const ingredientsBySection = recipe
    ? recipe.ingredients_json.reduce(
        (acc, ingredient) => {
          const section = ingredient.section || "Main";
          if (acc[section] === undefined) {
            acc[section] = [];
          }

          acc[section].push(ingredient);
          return acc;
        },
        {} as Record<string, Ingredients[]>,
      )
    : {};

  return (
    // Layer 1: Backdrop
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onCloseClick}
    >
      {/* Layer 2: Modal container */}
      <div
        className="bg-background rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-2xl text-text-secondary animate-pulse">
              Loading Recipe...
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="text-2xl text-accent">{error}</div>
            <button
              onClick={onCloseClick}
              className="px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md"
            >
              Close
            </button>
          </div>
        )}

        {/* Recipe content */}
        {recipe && (
          <>
            <div className="bg-surface border-2 border-border rounded-2xl shadow-xl overflow-hidden">
              {/* Header with decorative top border */}
              <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2" />

              {/* Title Section */}
              <div className="px-5 pt-3 pb-2 text-center border-b border-border/50 border-dashed">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{recipe.emoji || "🍽️"}</span>
                  <h1 className="text-xl font-bold text-text">{recipe.name}</h1>
                </div>
                <div className="flex items-center justify-center gap-3 mt-1 text-text-secondary text-xs">
                  <span className="px-2 py-0.5 bg-muted rounded-full">
                    {recipe.category}
                  </span>
                  <span className="px-2 py-0.5 bg-muted rounded-full">
                    {recipe.servings} servings
                  </span>
                  {recipe.time.active_min > 0 && (
                    <span className="px-2 py-0.5 bg-muted rounded-full">
                      👩‍🍳 {recipe.time.active_min}m
                    </span>
                  )}
                  {recipe.time.total_time > 0 && (
                    <span className="px-2 py-0.5 bg-muted rounded-full">
                      ⏱️ {recipe.time.total_time}m
                    </span>
                  )}
                </div>
                {/* Show creator info if viewing someone else's recipe */}
                {!isOwner && (
                  <p className="text-xs text-text-secondary mt-2">
                    Created by {recipe.user_name}
                  </p>
                )}
              </div>

              {/* Macros Section - Inline */}
              <div className="px-5 py-2 bg-muted/30 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs">
                <span className="font-medium text-text">
                  <span className="text-accent">
                    {recipe.per_serving_calories}
                  </span>{" "}
                  cal
                </span>
                <span className="text-border">|</span>
                <span className="font-medium text-text">
                  <span className="text-primary">
                    {recipe.per_serving_protein_g}g
                  </span>{" "}
                  protein
                </span>
                <span className="text-border">|</span>
                <span className="font-medium text-text">
                  <span className="text-secondary">
                    {recipe.per_serving_carbs_g}g
                  </span>{" "}
                  carbs
                </span>
                <span className="text-border">|</span>
                <span className="font-medium text-text">
                  <span className="text-primary">
                    {recipe.per_serving_fat_g}g
                  </span>{" "}
                  fat
                </span>
                {recipe.per_serving_sugar_g > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span className="font-medium text-text">
                      <span className="text-accent">
                        {recipe.per_serving_sugar_g}g
                      </span>{" "}
                      sugar
                    </span>
                  </>
                )}
              </div>

              {/* Two Column Layout for Ingredients & Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                {/* Ingredients Section */}
                <div className="px-4 py-3 border-t border-r-0 sm:border-r border-border/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">🥗</span>
                    <h2 className="text-sm font-bold text-text">Ingredients</h2>
                  </div>
                  <div className="space-y-5">
                    {Object.entries(ingredientsBySection).map(
                      ([section, ingredients]) => (
                        <div key={section}>
                          {Object.keys(ingredientsBySection).length > 1 && (
                            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 pl-1.5 border-l-2 border-secondary">
                              {section}
                            </h3>
                          )}
                          <ul className="space-y-0.5">
                            {ingredients.map((ing, idx) => (
                              <li
                                key={idx}
                                className={`flex items-start gap-2 text-sm ${ing.optional ? "opacity-70" : ""}`}
                              >
                                <span className="w-3 h-3 rounded-full bg-primary/20 border border-primary/40 flex-shrink-0 mt-1" />
                                <span className="text-text">
                                  <span className="font-medium">
                                    {ing.quantity} {ing.unit}
                                  </span>{" "}
                                  {ing.name}
                                  {ing.prep && (
                                    <span className="text-text-secondary text-xs">
                                      , {ing.prep}
                                    </span>
                                  )}
                                  {ing.optional && (
                                    <span className="text-text-secondary text-xs">
                                      {" "}
                                      (opt)
                                    </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Instructions Section */}
                <div className="px-4 py-3 border-t border-border/50 bg-muted/10">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">📝</span>
                    <h2 className="text-sm font-bold text-text">
                      Instructions
                    </h2>
                  </div>
                  <ol className="space-y-2">
                    {recipe.instructions_json
                      .sort((a, b) => a.step - b.step)
                      .map((instruction) => (
                        <li key={instruction.step} className="flex gap-2">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary/30 border border-secondary/50 flex items-center justify-center text-xs font-bold text-text">
                            {instruction.step}
                          </div>
                          <p className="text-text text-sm leading-snug">
                            {instruction.text}
                          </p>
                        </li>
                      ))}
                  </ol>
                </div>
              </div>

              {/* Footer with decorative border */}
              <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 h-2" />
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-4 p-4">
              <button
                onClick={onCloseClick}
                className="px-6 py-2 bg-surface hover:bg-muted border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                Close
              </button>

              {isOwner && (
                <button
                  onClick={() => {
                    sessionStorage.setItem(
                      "recipe_edit",
                      JSON.stringify(recipe),
                    );
                    router.push("/create_recipe");
                  }}
                  className="px-6 py-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  Edit
                </button>
              )}

              <button
                onClick={() => router.push(`/recipe/${recipeId}`)}
                className="p-2 bg-secondary hover:bg-secondary/80 border-2 border-border rounded-xl shadow-md hover:shadow-lg hover:scale-[1.1] transition-all"
                aria-label="Open full page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  className="w-5 h-5"
                  fill="none"
                >
                  {/* Arrow body */}
                  <rect x="10" y="27" width="30" height="10" rx="5" fill="#4a5568" />
                  {/* Arrow head */}
                  <path
                    d="M35 18 L54 32 L35 46"
                    stroke="#4a5568"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </button>

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
                  <rect
                    x="14"
                    y="12"
                    width="36"
                    height="6"
                    rx="3"
                    fill="#4a5568"
                  />
                  <rect
                    x="25"
                    y="7"
                    width="14"
                    height="7"
                    rx="3.5"
                    fill="#4a5568"
                  />
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
          </>
        )}
      </div>
    </div>
  );
}
