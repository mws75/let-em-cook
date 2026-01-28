# Full API Flow

## Delete Recipe Flow

1. User Clicks Delete Button in the Recipe Card Component

2. RecipeCard.tsx
   - handleDeleteClick is called
   - Makes API Call to /api/recipes/${recipe.recipe_id}
   - On Success, calls onDelete(recipe.recipe_id) callback function

3. API Route /api/recipes/[id]/routes.ts
   - Recieves DELETE request
   - Validate Recipe ID
   - Gets the UserID via getOrCreateUser()
   - Calls the deleteRecipe(userId, recipeId) database function

4. Database Function `deleteRecipe.ts`
   - Uses `executeQuery` from the connection pool
   - Runs SQL to delete
   - Returns `{deleted: true}` on success

5. Back to Dashboard/page.tsx
   - `handleRecipeDelete` recieves the deleted recipe ID
   - calls below script
   - React re-renders and the REcipe Card disappears from tue UI.

### handleRecipeDelete

```js
    const handleRecipeDelete = (recipe_id: number) => {
        setRecipes(recipes.filter((r) => r.recipe.id !== recipe_id));
```

### handleDeleteClick

```js
const handleDeleteClick = async () => {
  try {
    const response = await fetch(`api/recipes/${recipe.recipe_id}`, {
      method: "DELETE",
    });
    if (onDelete) {
      onDelete(recipe.recipe_id);
    }
  } catch (error) {
    console.log(error);
  }
};
```

### API Call

```js
    export async function DELETE(
        request: NextRequest,
        {params} : {params: {id: string}},
    ) {
        try {
            const recipeId = Number(params.id);
            const userId = await getOrCreateUser();
            const result = await deleteRecipe(userId, recipeId);
            return NextResponse.json(result, {status: 200});
        } catch (error) {
            return NextResponse.json({error: "Failed to delete"}, {status: 400});
        }
    }

```

### Database Script

```js

    export async function deleteRecipe(
        userId: number,
        recipeId: number,
    ) : Promise<{deleted: true}> {
        try{
            const query = `DELETE FROM ltc_recipes r WHERE r.user_id = ? AND r.recipe_id = ?`
            const result = await executeQuery<ResultSetHeader>(query, [userId, recipeId]);
            return {deleted: true};
        } catch (error) {
            throw new Error("Failed to Delete");
        }
    }

```

UI -> API -> Database -> UI
