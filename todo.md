# TODO

## Dashboard []

1. Create Search Functionationality [x]
2. Generate List Functionality [x]
3. Create Recipe Functionality [x]
4. Delete Recipe Functionality
5. Edit Recipe Functionality
6. Macros Functionality
7. Hover and show all the ingredients

## Create Recipe Functionality

1. Create Front End functionality [x]

#### Major Refactor

2. Create BackEnd functionality [x]
   a. Input data [x]
   - Sub Steps
     i. Update SubmitClick to Parallel API Calls for Validation [x]
     ii. Disable button why the Submission is occuring [x]
     iii. Pick something better than "|" delimiter [x]
     iv. Redirect back to home page [x]
     v. Create a Handler for API Error for DRY principle [x]

   b. Create src/app/api/create-recipe/route.ts to convert to proper json format [x]
   - Add IsPublic Checkbox [x]
   - handleIsPublicSelected [x]
   - Add Servings [x]
   - Better Formatting [x]
     i. Add the macros and calories [x]
     ii. Create json object from the input that can then be added to database [x]

   c. set up Database api for planet scale [x]
   - Sub Steps:
     i. Run database schema simplification migration [x]
     - Create branch: `pscale branch create one-offs-v2 schema-simplification`
     - Connect: `pscale shell one-offs-v2 schema-simplification`
     - Check FK/index names: `SHOW CREATE TABLE ltc_recipes;`
     - Update migration script with actual constraint names
     - Run `/migrations/001_simplify_schema.sql` (execute line by line)
     - Verify: `DESCRIBE ltc_recipes;` and `SHOW TABLES;`
     - Test INSERT with sample data
     - Create deploy request: `pscale deploy-request create`
     - See: `/docs/SCHEMA_SIMPLIFICATION_SUMMARY.md` for details
       ii. Implement insertRecipe helper function [x]
     - Create `src/lib/database/insertRecipe.ts`
     - Implement category lookup/create logic
     - Implement single INSERT with all recipe fields
     - See: `/docs/INSERT_RECIPE_IMPLEMENTATION_PLAN.md` for algorithm
       iii. Update API route to call insertRecipe [x]

   d. Create src/app/api/insertData file to insert data into database [x]

## Stripe Integration[]

1. Create Stripe Integration on Front End [x]
2. Update ltc_users table with stripe_customer_id and stripe_subscription_id [x]
3. Create Stripe API backend [x]
4. Create WebHooks [x]
5. Create User Profile to
   -> Cancel [x]
   -> Pause [x]
   -> View Payment History [x]
6. Testing:
   -> Subscribe with good card []
   -> Subscribe with bad card []
   -> Cancel Subscription []

7. set up Production Stripe Environment

## Email

1. Create Email Address [x] - michael.spencer@let-em-cook.io | support@let-em-cook.it
   a. Test one - send to michael.spencer@let-em-cook.io [x]
   b. Test two - send to support@let-em-cook.io [x]
2. Create Contact Us page [] - with ability to email support
   a. Footer [x]
   b. Set Up Resend[x]
   c. Create Database Table [x]
   d. Create the API Route [x]
   e. Create the contact page [x]
   f. Add Footer to Dashboard [x]
   #### g. **Testing** []
   i. Login can navigate to Contact Dashboard []
   ii. Verify name and email pre-populate []
   iii. Type a message, click send []
   iv. Verify CookingTyips appears during submission []
   v. Verify success toast appears []
   vi. Verify redirect to dashboard []
   vii. Check email arriaved to support@let-em-cook.io in Zoho module []
   viii. Check that the ltc_contact_support table has a new row. []
   #### h. **Email validation** []
   i. Submit with empty Message []
   ii. Subimt with message under 10 charcters []
   iii. Submit with message over 2000 characters []
   #### i. **Rate Limiting** []
   i. Submit 3 message successfully []
   ii. Forth message with 24 hours - should return 429 []
   #### j. **Auth** []
   i. Visit contact page while logged out []

## RecipePage [x]

1. Design Recipe Page [x]
2. Create Recipe Page [x]

## Browse Public Recipes Page []

1. Design the Browse Page
2. Create The Browse Page

## Refactoring after MVP

### Add Zod for Type Checking

## Analytics []

1. Sign Up and enable Google Analytics 4 (GA4)
