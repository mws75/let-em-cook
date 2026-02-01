# RCA: Stripe Subscription Not Activating After Checkout

**Date:** 2026-01-28
**Severity:** High — paying users were not receiving Pro access after successful payment
**Status:** Resolved

---

## Summary

**Problem:** After a user completed Stripe checkout and paid for a Pro subscription, their account remained on the free tier. The `stripe_customer_id` was saved, but `stripe_subscription_id` stayed `NULL` and `plan_tier` stayed `free`.

**Solution:** The webhook that handles post-checkout updates was looking up the user by email, but Stripe was not providing the email on the checkout session object. We changed the lookup to use `stripe_customer_id` instead, which is always available and was already saved to the database before checkout.

---

## Impact

- Users who paid for Pro were not upgraded
- Users were blocked from creating recipes beyond the free tier limit despite having an active subscription
- The Stripe charge went through successfully, but the application did not reflect the subscription status

---

## Root Cause Analysis

### The Flow (How It Should Work)

1. User clicks "Upgrade to Pro" on the dashboard
2. `POST /api/stripe/create-checkout-session` creates a Stripe customer (if new) and a checkout session
3. User completes payment on Stripe's hosted checkout page
4. Stripe fires a `checkout.session.completed` webhook event
5. The webhook handler updates the user's `stripe_subscription_id` and `plan_tier` in the database

### Where It Broke: Step 4 → Step 5

The webhook handler in `checkout.session.completed` attempted to find the user by email:

```ts
const customerEmail = session.customer_email || session.metadata?.user_email;

if (customerEmail) {
  await updateUserSubscription(
    customerEmail,
    customerId,
    subscriptionId,
    "pro",
  );
}
```

**The problem:** `session.customer_email` is `null`.

When creating the checkout session, we pass an existing Stripe `customer` object (not a raw email):

```ts
// src/app/api/stripe/create-checkout-session/route.ts
const session = await stripe.checkout.sessions.create({
  customer: customerId, // <-- existing customer object
  mode: "subscription",
  // ...
});
```

Stripe only populates `session.customer_email` when you pass `customer_email` directly to the session creation. When you pass a `customer` object instead, `customer_email` is not set on the resulting session.

The fallback `session.metadata?.user_email` was set during session creation, but the primary lookup still failed silently because the code was wrapped in `if (customerEmail)` — if both values were somehow falsy, the entire update was skipped without logging an error.

### Why `stripe_customer_id` Was Saved But Nothing Else

This was a red herring that made the issue confusing. The `stripe_customer_id` was **not** saved by the webhook. It was saved earlier, during checkout session creation:

```ts
// src/app/api/stripe/create-checkout-session/route.ts (lines 42-46)
await executeQuery<ResultSetHeader>(
  "UPDATE ltc_users SET stripe_customer_id = ? WHERE user_id = ?",
  [customerId, user.user_id],
);
```

This runs **before** the user even sees the Stripe checkout page, so it always succeeds. The webhook was supposed to save the remaining fields (`stripe_subscription_id`, `plan_tier`), but it never reached that code path.

### Database State After Failed Webhook

| Column                   | Expected             | Actual               |
| ------------------------ | -------------------- | -------------------- |
| `stripe_customer_id`     | `cus_TsPpU8G0wSSmVm` | `cus_TsPpU8G0wSSmVm` |
| `stripe_subscription_id` | `sub_XXXXX`          | `NULL`               |
| `plan_tier`              | `pro`                | `free`               |

---

## Fix

### File 1: `src/app/api/stripe/webhook/route.ts`

Changed the `checkout.session.completed` handler to use `stripe_customer_id` (which is always present on the session) instead of email.

**Before:**

```ts
case "checkout.session.completed": {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode === "subscription" && session.subscription) {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const customerEmail = session.customer_email || session.metadata?.user_email;

    if (customerEmail) {
      await updateUserSubscription(customerEmail, customerId, subscriptionId, "pro");
    }
  }
  break;
}
```

**After:**

```ts
case "checkout.session.completed": {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode === "subscription" && session.subscription) {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    await updateUserSubscription(customerId, subscriptionId, "pro");
  }
  break;
}
```

- Removed the email lookup entirely
- Removed the `if (customerEmail)` guard that was silently skipping the update
- The `customerId` (`session.customer`) is always provided by Stripe on a checkout session

### File 2: `src/lib/database/updateUserSubscription.ts`

Changed the database query to look up users by `stripe_customer_id` instead of `email`.

**Before:**

```ts
export async function updateUserSubscription(
  email: string,
  customerId: string,
  subscriptionId: string,
  planTier: string,
): Promise<void> {
  await executeQuery<ResultSetHeader>(
    `UPDATE ltc_users
     SET stripe_customer_id = ?, stripe_subscription_id = ?, plan_tier = ?
     WHERE email = ?`,
    [customerId, subscriptionId, planTier, email],
  );
}
```

**After:**

```ts
export async function updateUserSubscription(
  stripeCustomerId: string,
  subscriptionId: string,
  planTier: string,
): Promise<void> {
  await executeQuery<ResultSetHeader>(
    `UPDATE ltc_users
     SET stripe_subscription_id = ?, plan_tier = ?
     WHERE stripe_customer_id = ?`,
    [subscriptionId, planTier, stripeCustomerId],
  );
}
```

- Removed `email` parameter, replaced with `stripeCustomerId`
- No longer sets `stripe_customer_id` in the UPDATE (it's already saved during checkout session creation)
- WHERE clause uses `stripe_customer_id` which is a reliable, indexed column

---

## Why This Fix Is More Reliable

| Approach                 | Relies On                                          | Risk                                                                              |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Email lookup (old)       | `session.customer_email` being populated by Stripe | Stripe does not populate this field when a `customer` object is passed            |
| Customer ID lookup (new) | `session.customer` being present                   | Always present — it's a required field on the session when a customer is attached |

The `stripe_customer_id` is saved to the database before checkout begins, and Stripe always includes it on the session object. There is no scenario where it would be missing.

---

## Manual Remediation

For users affected before the fix was deployed, a manual database update is required:

```sql
UPDATE ltc_users
SET plan_tier = 'pro',
    stripe_subscription_id = '<subscription_id_from_stripe_dashboard>'
WHERE stripe_customer_id = '<customer_id>';
```

The subscription ID can be found in the Stripe dashboard under the customer's profile.

---

## Lessons Learned

1. **Don't assume Stripe populates all session fields.** The behavior of `customer_email` depends on how the checkout session is created. Always verify which fields are available for your specific integration pattern.
2. **Silent failures are dangerous.** The `if (customerEmail)` guard meant the update was skipped without any error log. Failed webhook operations should always log a warning.
3. **Use the most direct identifier available.** The `stripe_customer_id` was already in the database and always on the session object. Using email as an intermediary added an unnecessary point of failure.
