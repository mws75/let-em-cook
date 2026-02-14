1. User Clicks the CheckBox
2. `onChange={...}` fires in RecipeCard
3. `onSelect(recipe, envent.target.checked)` calls parent `onSelect ``
4. Parent updates `selectedRecipes(...)`
5. `some(...)`  recalculates `isSelected` for each card 
6. React Sets `checked={isSelected}` 

Example: 
### Parent Component 

```js
export default function ParentComponent(){
	const [isSelected, setIsSelected] = useState(false);
	const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);
	const [recipes, setRecipes] = useState<String[]>([]);
	
	const recipes = [
	    { id: 1, name: "Pizza" },
	    { id: 2, name: "Pasta" },
	  ];
	
	const handleRecipeCheckBoxSelect = () => {
		setSelectedRecipes((prev) => 
			isChecked
				? [...prev, id]
				: prev.filter((recipeId) => recipeId != id)
		);
	}
	
	return (
		<div>
			<div>
				<h1>My Recipes </h1>
			</div>
			<div>
				{recipes.map((r) => 
					<ChildComponent
						key={r.id}
						recipe={r}
						isSelected={selectedRecipes.some(
							(r) => r.recipe_id === recipe.recipe_id,
						)}
						onSelect={handleRecipeCheckBoxSelect}
				)}
			</div> 
		</div>
	)
}
```

### Child Component 
```js
type ChildProps = (
	recipe: {id: number, name: string};
	isSelect: boolean;
	onSelect: (id: number, checked: boolean) => void;
);

export default function ChildComponent(
	{recipe, 
	isSelected, 
	onSelect}: ChildProps
){
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onSelect(recipe.id, e.target.checked)
	}

	return (
		<div>
			<label>
				<input
					type="checkBox"
					checked={isSelected || false}
					onClick={onSelect}
					onChange={handleChange}
				/> 
				{recipe.name}
			</label>
		</div> 
	)
}
```
