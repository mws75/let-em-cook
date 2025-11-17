import React, { useState } from "react";
import type { Recipe, Instructions, Ingredients } from "@/types/types";

type RecipeCardProps = {
  recipe: Recipe;
};

export default function RecipeCard({ recipe }: RecipeCardProps) {
  /*const [recipeName, setRecipeName] = useState("Recipe 1");*/
  const [isRecipeBoxChecked, setIsRecipeBoxChecked] = useState(false);
  const {
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

  const handleRecipeCheckBoxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsRecipeBoxChecked(event.target.checked);
  };

  return (
    <div className="relative w-70 h-75 border-2 border-border rounded-2xl bg-surface shadow-lg ml-2 mr-5 mb-5">
      <div className="flex">
        <h2 className="text-xl text-text font-bold m-3">{name}</h2>
        <input
          type="checkbox"
          className="m-3 absolute top-:0 right-0 w-7 h-7 cursor-pointer accent-accent"
          onChange={handleRecipeCheckBoxChange}
        />
      </div>
      <div>
        <h3 className="text-base text-text font-bold ml-3 mr-1">Ingredients</h3>
        <p className="text-base text-text mt-2 ml-3 mr-1">
          {ingredients_json[0].name}: {ingredients_json[0].quantity} ...
        </p>
        <h3 className="text-base text-text font-bold ml-3 mr-1 mt-6">
          Instructions
        </h3>
        <p className="text-base text-text mt-2 ml-3 mr-1">
          {instructions_json[0].step}:{" "}
          {instructions_json[0].text.substring(0, 10)}
        </p>
      </div>
      <div className="flex absolute bottom-0 right-0">
        <div className="mt-2 mr-3 mb-3">
          <button className="px-6 py-2 mr-2 bg-primary hover:bg-primary/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all">
            edit
          </button>
          <button className="px-6 py-2 bg-accent hover:bg-accent/80 border-2 border-border rounded-xl font-bold text-text shadow-md hover:shadow-lg hover:scale-[1.02] transition-all">
            delete
          </button>
        </div>
      </div>
    </div>
  );
}
