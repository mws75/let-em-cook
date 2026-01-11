# Getting Users Recipes

1. User signs in via Clerk
2. On first sign-in, getOrCreateUser() creates a new record in ltc_users table with their email and username.
3. On subsquent requests, it looks up their database user_id by the email registered with clerk sign-in.
4. All recipes are now tied to the real authenticated users email.
5. Dashboard only shows the logged-in user's recipes.
6. **Security** - API Routes automatically get user_id from authentication. Therefore users can't access other user's recipes.
