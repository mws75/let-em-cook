import React, { useState } from "react";

export default function RecipeCard() {
  const [recipeName, setRecipeName] = useState("Recipe 1");
  const [isRecipeBoxChecked, setIsRecipeBoxChecked] = useState("false");

  const handleRecipeCheckBoxChange = (event) => {
    setIsRecipeBoxChecked(event.target.checked);
  };

  return (
    <div className="relative w-75 h-75 border-2 border-border rounded-2xl bg-surface shadow-lg ml-5 mr-5 mb-5">
      <div className="flex">
        <h2 className="text-xl text-text font-bold m-3">{recipeName}</h2>
        <input
          type="checkbox"
          className="m-3 absolute top-0 right-0 w-7 h-7 cursor-pointer accent-accent"
          onChange={handleRecipeCheckBoxChange}
        />
      </div>
      <div>
        <h3 className="text-base text-text font-bold ml-3 mr-1">Ingredients</h3>
        <p className="text-base text-text mt-2 ml-3 mr-1">
          Ingredient 1 \n Ingredient 2 \n Ingredient 3
        </p>
        <h3 className="text-base text-text font-bold ml-3 mr-1 mt-6">
          Instructions
        </h3>
        <p className="text-base text-text mt-2 ml-3 mr-1">
          1. This 2. That 3. And the other thing
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
