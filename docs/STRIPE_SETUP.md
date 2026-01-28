# Stripe Subscription Setup Guide

This guide walks you through setting up Stripe subscriptions for the Let Em Cook Pro tier.

## Overview

- **Free Tier**: 10 recipes maximum
- **Pro Tier**: $4.99/month, unlimited recipes

## Prerequisites

- A Stripe account (create one at [stripe.com](https://stripe.com)) [x]
- Access to the Stripe Dashboard [x]

## Step 1: Create Your Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account [x]
2. Complete the account verification process [x]
3. For development, you can use Test Mode (no real payments) [x]

## Step 2: Create the Product

1. In the Stripe Dashboard, go to **Products** > **Add Product** [x]
2. Fill in the details:
   - **Name**: `Let Em Cook Pro` [x]
   - **Description**: `Unlimited recipe storage for home chefs` [x]
   - You can add an image if desired [x]
3. Click **Add Product** [x]

## Step 3: Create the Price

1. In the product you just created, click **Add Price** [x]
2. Configure the price: [x]
   - **Pricing Model**: Standard pricing [x]
   - **Price**: `$4.99` [x]
   - **Billing Period**: Monthly [x]
   - **Currency**: USD (or your preferred currency) [x]
3. Click **Add Price** [x]
4. **Important**: Copy the Price ID (starts with `price_`) - you'll need this for `STRIPE_PRICE_ID`[x]

## Step 4: Set Up the Webhook Endpoint

1. In the Stripe Dashboard, go to **Developers** > **Webhooks**
2. Click **Add Endpoint**
3. Configure:
   - **Endpoint URL**: `https://your-domain.com/api/stripe/webhook`
     - For local development: Use a tool like [ngrok](https://ngrok.com) to create a tunnel
   - **Events to send**: Select the following events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Click **Add Endpoint**
5. **Important**: Copy the **Signing Secret** (starts with `whsec_`) - you'll need this for `STRIPE_WEBHOOK_SECRET`

### Local Development with ngrok

For local webhook testing:

```bash
# Install ngrok
brew install ngrok

# Start your Next.js dev server
npm run dev

# In another terminal, create a tunnel
ngrok http 3000
```

Use the ngrok URL (e.g., `https://abc123.ngrok.io/api/stripe/webhook`) as your webhook endpoint.

## Step 5: Configure the Customer Portal

1. In the Stripe Dashboard, go to **Settings** > **Billing** > **Customer Portal**
2. Enable the Customer Portal
3. Configure allowed actions:
   - **Cancel subscriptions**: Allow customers to cancel
   - **Switch plans**: Optional (if you add more tiers later)
   - **Update payment methods**: Recommended
4. Customize the look and feel to match your app
5. Save changes

## Step 6: Get Your API Keys

1. In the Stripe Dashboard, go to **Developers** > **API Keys**
2. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

**Warning**: Never expose your Secret Key in client-side code or commit it to version control.

## Step 7: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRICE_ID=price_your_price_id_here

# App URL (used for redirect URLs)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, use your live keys and update `NEXT_PUBLIC_APP_URL` to your production URL.

## Step 8: Run Database Migration

Run this SQL migration on your database to add the Stripe columns:

```sql
ALTER TABLE ltc_users
ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN stripe_subscription_id VARCHAR(255) DEFAULT NULL;

CREATE INDEX idx_stripe_customer_id ON ltc_users(stripe_customer_id);
```

## Testing

### Test Card Numbers

Use these test card numbers in Test Mode:

| Card Number           | Description             |
| --------------------- | ----------------------- |
| `4242 4242 4242 4242` | Successful payment      |
| `4000 0000 0000 0002` | Card declined           |
| `4000 0025 0000 3155` | Requires authentication |

Use any future expiration date, any 3-digit CVC, and any postal code.

### Test Flow

1. Create a new account (will be free tier with 0/10 recipes)
2. Create 10 recipes (count should update correctly)
3. Try to create an 11th recipe (upgrade modal should appear)
4. Click "Upgrade Now" (should redirect to Stripe Checkout)
5. Complete payment using test card `4242 4242 4242 4242`
6. Should redirect to dashboard with success toast
7. User should now show as Pro and can create unlimited recipes
8. Click "Manage Subscription" to access the Customer Portal
9. Cancel subscription in the portal
10. User should be downgraded to free tier

## Troubleshooting

### Webhook Not Receiving Events

1. Check the webhook endpoint URL is correct
2. Verify the webhook secret matches `STRIPE_WEBHOOK_SECRET`
3. Check Stripe Dashboard > Developers > Webhooks > Event logs for errors
4. For local development, ensure ngrok tunnel is running

### Customer Not Being Updated

1. Check the webhook logs in Stripe Dashboard
2. Verify the email in your database matches the Stripe customer email
3. Check your server logs for errors

### Checkout Session Failing

1. Verify `STRIPE_PRICE_ID` is correct
2. Check that the price is active in Stripe
3. Ensure `NEXT_PUBLIC_APP_URL` is set correctly

## Going Live

When ready for production:

1. Complete Stripe account verification
2. Switch from Test Mode to Live Mode in Stripe Dashboard
3. Create a new product and price in Live Mode
4. Update webhook endpoint to production URL
5. Replace all test keys with live keys in production environment variables
6. Test the full flow with a real card

## Support

For Stripe-specific issues, refer to the [Stripe Documentation](https://stripe.com/docs).
