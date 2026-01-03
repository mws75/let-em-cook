# TODO

## Dashboard []

1. Create Search Functionationality [x]
2. Generate List Functionality [x]
3. Create Recipe Functionality []
4. Delete Recipe Functionality
5. Edit Recipe Functionality
6. Macros Functionality
7. Hover and show all the ingredients

## Create Recipe Functionality

1. Create Front End functionality [x]

#### Major Refactor

2. Create BackEnd functionality []
   a. Input data [x]
   - Sub Steps
     i. Update SubmitClick to Parallel API Calls for Validation [x]
     ii. Disable button why the Submission is occuring [x]
     iii. Pick something better than "|" delimiter [x]
     iv. Redirect back to home page [x]
     v. Create a Handler for API Error for DRY principle [x]

   b. Create src/app/api/create-recipe/route.ts to convert to proper json format []
   - Add IsPublic Checkbox [x]
   - handleIsPublicSelected [x]
   - Add Servings [x]
   - Better Formatting [x]
     i. Add the macros and calories []
     ii. Create json object from the input that can then be added to database []

   c. set up Database api for planet scale
   d. Create src/app/api/insertData file to insert data into database []

## RecipePage []

1. Design Recipe Page
2. Create Recipe Page

## Browse Public Recipes Page []

1. Design the Browse Page
2. Create The Browse Page
