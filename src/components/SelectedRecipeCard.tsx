import type { Recipe, Instructions, Ingredients } from "@/types/types";

type SelectedRecipeCardProps = {
  recipe: Recipe;
};

export default function SelectedRecipeCard({
  recipe,
}: SelectedRecipeCardProps) {
  const {
    name,
    per_serving_calories,
    per_serving_protein_g,
    per_serving_fat_g,
    per_serving_carbs_g,
    per_serving_sugar_g,
  } = recipe;

  return (
    <div className="relative w-50 h-50 border-2 border-border rounded-2xl bg-surface shadow-lg ml-2 mr-5 mb-5">
      <div className="flex">
        <h3 className="text-lg text-text font-bold m-2">{name}</h3>
        <h3 className="text-base text-text font-bold m-2">Nutrition</h3>
        <p className="text-sm text-text mt-2 ml-2 mr-1">
          calories: {per_serving_calories} <br />
          protein: {per_serving_protein_g}g <br />
          fat: {per_serving_fat_g}g <br />
          carbs: {per_serving_carbs_g}g <br />
        </p>
      </div>
    </div>
  );
}
