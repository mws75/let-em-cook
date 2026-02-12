import type { Recipe } from "@/types/types";
import { getCategoryColor } from "@/lib/categoryColors";

type SelectedRecipeCardProps = {
  recipe: Recipe;
};

export default function SelectedRecipeCard({
  recipe,
}: SelectedRecipeCardProps) {
  const { name, category } = recipe;
  const categoryColor = getCategoryColor(category || "");

  return (
    <div
      className="border-2 border-border rounded-2xl px-5 py-2 shadow-md"
      style={{
        background: "#ffffff",
        boxShadow: `inset 0 0 20px 8px ${categoryColor}`,
      }}
    >
      <span className="text-base text-text font-bold">{name}</span>
    </div>
  );
}
