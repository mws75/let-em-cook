# Stripe Production Setup Guide

This guide walks you through setting up Stripe for production in the Let 'Em Cook application.

## Prerequisites

- A Stripe account (create one at https://stripe.com if you don't have one)
- Your production domain (e.g., `https://let-em-cook.io`)
- Access to your hosting platform's environment variables (e.g., Vercel)

## Step 1: Activate Your Stripe Account

1. Go to https://dashboard.stripe.com
2. Click on **"Activate your account"** in the top banner (or Settings > Account details)
3. Complete the business verification:
   - Business type (individual, company, etc.)
   - Business details (name, address, tax ID)
   - Bank account for payouts
   - Identity verification (may require ID upload)
4. Wait for approval (usually instant for US accounts)

## Step 2: Switch to Live Mode

1. In the Stripe Dashboard, toggle the **"Test mode"** switch OFF (top-right corner)
   - The dashboard background changes from orange-striped to solid
2. You are now in **Live mode**

## Step 3: Get Your Live API Keys

1. Go to **Developers > API keys** (https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** (starts with `pk_live_`)
3. Click **"Reveal"** next to Secret key and copy it (starts with `sk_live_`)
4. Store these securely - you'll need them for Step 6

## Step 4: Create Your Production Product and Price

1. Go to **Products** (https://dashboard.stripe.com/products)
2. Click **"+ Add product"**
3. Fill in the product details:
   - **Name:** `Let 'Em Cook Pro`
   - **Description:** `Unlimited recipes and premium features`
   - **Image:** (optional) Upload your logo
4. Under **Pricing**:
   - **Pricing model:** Standard pricing
   - **Price:** `$4.99` (or your PRO_TIER_PRICE)
   - **Billing period:** Monthly
   - **Currency:** USD
5. Click **"Save product"**
6. On the product page, find the **Price ID** under the pricing section
   - It looks like: `price_1ABC123...`
   - Copy this - you'll need it for Step 6

## Step 5: Set Up the Production Webhook

This is critical - webhooks notify your app when payments succeed or subscriptions change.

### 5a. Create the Webhook Endpoint

1. Go to **Developers > Webhooks** (https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Enter your endpoint URL:
   ```
   https://your-domain.com/api/stripe/webhook
   ```
   Example: `https://let-em-cook.io/api/stripe/webhook`

4. Click **"Select events"** and add these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Click **"Add endpoint"**

### 5b. Get the Webhook Signing Secret

1. Click on your newly created webhook endpoint
2. Under **"Signing secret"**, click **"Reveal"**
3. Copy the secret (starts with `whsec_`)
4. Store this securely - you'll need it for Step 6

## Step 6: Configure Production Environment Variables

Add these environment variables to your production environment (e.g., Vercel):

| Variable | Value | Description |
|----------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Your live secret key from Step 3 |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Your live publishable key from Step 3 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook signing secret from Step 5b |
| `STRIPE_PRICE_ID` | `price_...` | Price ID from Step 4 |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` | Your production URL (no trailing slash) |

### For Vercel:

1. Go to your project in the Vercel dashboard
2. Navigate to **Settings > Environment Variables**
3. Add each variable above for the **Production** environment
4. Redeploy your application for changes to take effect

### For other platforms:

Set these as environment variables according to your platform's documentation.

## Step 7: Configure Customer Portal (Optional but Recommended)

The Customer Portal lets users manage their subscription (cancel, update payment method).

1. Go to **Settings > Billing > Customer portal** (https://dashboard.stripe.com/settings/billing/portal)
2. Configure the portal:
   - **Headline:** `Manage your Let 'Em Cook subscription`
   - **Privacy policy:** Link to your privacy policy
   - **Terms of service:** Link to your terms
3. Under **Functionality**, enable:
   - [x] Allow customers to update subscriptions
   - [x] Allow customers to cancel subscriptions
4. Click **"Save"**

## Step 8: Test in Production

### Pre-launch Checklist:

- [ ] Stripe account is activated and verified
- [ ] All 5 environment variables are set in production
- [ ] Webhook endpoint is created and active
- [ ] Application is redeployed with new env vars

### Testing Checklist:

1. **Test checkout flow:**
   - Create a new account on your production site
   - Try to add more than 5 recipes (should show upgrade prompt)
   - Click "Upgrade Now"
   - Verify you're redirected to Stripe Checkout with correct price
   - Complete payment with a real card (you can refund later)
   - Verify redirect back to `/dashboard?upgrade=success`
   - Verify user's `plan_tier` is now "pro" in database

2. **Test webhook delivery:**
   - In Stripe Dashboard > Developers > Webhooks
   - Click your endpoint
   - Check "Recent webhook attempts" - should show successful delivery

3. **Test customer portal:**
   - As a Pro user, access the customer portal (if implemented)
   - Verify you can see subscription details

4. **Test cancellation:**
   - Cancel subscription via Stripe Dashboard or Customer Portal
   - Verify webhook is received
   - Verify user's `plan_tier` changes to "free"

## Troubleshooting

### Webhook Errors

If webhooks aren't working:

1. Check the webhook logs in Stripe Dashboard > Developers > Webhooks > [your endpoint]
2. Verify the `STRIPE_WEBHOOK_SECRET` matches your endpoint's signing secret
3. Verify your endpoint URL is correct and accessible
4. Check your application logs for errors

### Payment Failures

1. Check Stripe Dashboard > Payments for declined payments
2. Common issues:
   - Card declined by bank
   - Insufficient funds
   - 3D Secure authentication required

### Subscription Not Updating

1. Verify webhook is being received (check Stripe Dashboard)
2. Check your application logs for database errors
3. Verify the `stripe_customer_id` matches in your database

## Security Notes

- **Never commit live API keys to git**
- Keep your `.env.local` file in `.gitignore`
- Rotate keys if they're ever exposed
- Use environment variables on your hosting platform

## Quick Reference: Environment Variables

```bash
# Production Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Switching Between Test and Production

Your `.env.local` should always use TEST keys for local development:

```bash
# Local Development (test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from test webhook or Stripe CLI)
STRIPE_PRICE_ID=price_... (test price ID)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Production environment (Vercel/etc.) uses LIVE keys as described above.

## Webhook Testing with Stripe CLI (Development)

For local development, use the Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# The CLI will display a webhook signing secret (whsec_...)
# Use this as STRIPE_WEBHOOK_SECRET in .env.local
```
