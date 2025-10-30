# Let-Em_Cook!

**Purpose** - A an application that allows you to
_ Input Recipes
_ save reciepes as tiles
_ select Recipes from those tiles and drag into a box that will contain a group of recieps
the user is interested in. You can only drag in a max of 10 reciepes (I might change that to 20.)
_ recieve a grocery list based on the recipes selected \* recieve nutrition stats and macros for the week based on those picks.

## Workflow

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
