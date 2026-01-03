# Let-Em-Cook!

**Purpose** - A an application that allows you to _ Input Recipes _ save reciepes as tiles _ select Recipes from those tiles and drag into a box that will contain a group of recieps the user is interested in. You can only drag in a max of 10 reciepes (I might change that to 20.) _ recieve a grocery list based on the recipes selected \* recieve nutrition stats and macros for the week based on those picks. ## Workflow

Below is the general loop of the application

```mermaid
flowchart LR
    step1[User inputs recipe]
    step2[Recipe is saved to RDS saved as JSON string]
    step3[User can select recipes into workspace]
    step4[User clicks generate grocery list]
    step5[JSON is sent to ChatGPT API]
    step6[Grocery list generated]:wq
    step7[Grocery list and nutirtion stats JSON is sent back to User]
    step8[JSON is validated or cleaned up]
    step9[Grocery List Formated for user to print]
    step10[nutrition facts populate the Dashboard]
```

## The Tech Stack

**Framework** - NextJS 16
**Data Base** - PlanetScale
**Authentication** - Clerk
**Payment System** - Stripe? - Need to do more research on the best option
**API Layer** - I won't have one for this application, because I like using sql, so I will use React Server Components
to fect data directly from the server, allowing me to skip the API layer.
**Testing** - Jest - [See Getting Started Documentation](https://jestjs.io/docs/getting-started)

## The Data Shape

Below is an example of what a typical recipe card json data structure will be for recipes:

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
```

### Queries

Here is the query to extract this data set:
