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
      className="inline-flex items-center border border-border rounded-full px-3.5 py-1.5"
      style={{ backgroundColor: categoryColor }}
    >
      <span className="text-sm text-text font-medium">{name}</span>
    </div>
  );
}
