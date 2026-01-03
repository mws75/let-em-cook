# Example of Data Structures

## Example of Recipe Data Structure

```json
{
  "recipe_id": 123,
  "user_id": 456,
  "user": "mwspencer75",
  "is_public": 1
  "category": "Soup",
  "name": "Chicken Consommé",
  "servings": 4,
  "per_serving_calories": 200,
  "per_serving_protein_g": 5,
  "per_serving_fat_g" : 10,
  "per_serving_carbs_g" : 10,
  "per_serving_sugar_g" : 0,
  "ingredients": [
    {
      "name": "chicken carcass",
      "quantity": 1,
      "unit": "each",
      "prep": "skin and fat         removed",
      "section": "meat"
    },
    {
      "name": "onion",
      "quantity": 1,
      "unit": "medium",
      "prep": "skin on, halved",
      "section": "produce"
    },
    { "name": "egg whites", "quantity": 3, "unit": "each", "section": "dairy" },
    {
      "name": "Kitchen Bouquet",
      "quantity": 0.25,
      "unit": "tsp",
      "optional": true,
      "section": "condiments"
    }
  ],
  "instructions": [
    { "step": 1, "text": "Combine carcass and aromatics in a large pot." },
    { "step": 2, "text": "Cover with cold water and bring to a gentle boil." }
  ],
  "tags": ["soup", "clarified"],
  "time": { "active_min": 20, "total_min": 120 }
}
`
```
