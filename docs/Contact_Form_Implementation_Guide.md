# Contact Form Implementation Guide

A step-by-step guide for adding a contact form to Let Em Cook. The form lives at `/contact`, is accessible from a footer on the dashboard, requires authentication, pre-fills the user's email from Clerk, sends messages to `support@let-em-cook.io` via Nodemailer through your existing Zoho Mail SMTP, and includes database-backed rate limiting.

---

## Table of Contents

1. [Install Dependencies](#1-install-dependencies)
2. [Set Up Zoho SMTP](#2-set-up-zoho-smtp)
3. [Create the Database Table](#3-create-the-database-table)
4. [Create the API Route](#4-create-the-api-route)
5. [Create the Contact Page](#5-create-the-contact-page)
6. [Add the Dashboard Footer](#6-add-the-dashboard-footer)
7. [Testing Checklist](#7-testing-checklist)

---

## 1. Install Dependencies

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

[Nodemailer](https://nodemailer.com) is a Node.js library for sending emails via SMTP. Since you already have Zoho Mail handling email for `let-em-cook.io`, no additional email service or DNS changes are needed.

---

## 2. Set Up Zoho SMTP

### 2a. Get your Zoho SMTP credentials

You'll send emails from your existing Zoho mailbox. The SMTP settings for Zoho are:

| Setting | Value |
|---------|-------|
| Host | `smtp.zoho.com` |
| Port | `465` (SSL) or `587` (TLS) |
| Auth | Your Zoho email and password (or app-specific password) |

### 2b. Generate an app-specific password (recommended)

If you have 2FA enabled on your Zoho account (you should), you'll need an app-specific password:

1. Go to [accounts.zoho.com](https://accounts.zoho.com)
2. Navigate to **Security** > **App Passwords**
3. Generate a new password for "Let Em Cook Contact Form"
4. Copy the generated password

### 2c. Add to `.env.local`

```env
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=465
ZOHO_SMTP_USER=support@let-em-cook.io
ZOHO_SMTP_PASSWORD=your_app_specific_password_here
```

> **Note:** Use the actual Zoho account email you want to send from. The `from` address in Nodemailer must match the authenticated account — Zoho will reject mismatched sender addresses.

---

## 3. Create the Database Table

This table serves two purposes: rate limiting and keeping a record of all contact form submissions.

```sql
CREATE TABLE IF NOT EXISTS ltc_contact_submissions (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  user_email      VARCHAR(255)    NOT NULL,
  user_name       VARCHAR(255)    NOT NULL,
  message         TEXT            NOT NULL,
  created_on      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_rate_limit (user_id, created_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

The `idx_user_rate_limit` index makes the rate-limit query fast.

---

## 4. Create the API Route

**File:** `src/app/api/contact/route.ts`

This route handles the form submission. It follows the same pattern as other API routes in the project.

### What the route should do:

1. **Authenticate** — Call `getOrCreateUser()` to get the current user. Return 401 if not authenticated.

2. **Parse and validate input** — Extract `name`, `email`, and `message` from the request body. Validate:
   - `name` is present and under 100 characters
   - `email` is present and looks like a valid email
   - `message` is present, at least 10 characters, and under 2000 characters

3. **Rate limit check** — Query the `ltc_contact_submissions` table to count how many submissions this `user_id` has made in the last 24 hours. If 3 or more, return a 429 error with a message like "You can only send 3 messages per day."

   ```sql
   SELECT COUNT(*) as count
   FROM ltc_contact_submissions
   WHERE user_id = ? AND created_on > DATE_SUB(NOW(), INTERVAL 24 HOUR)
   ```

4. **Send the email via Nodemailer + Zoho SMTP** — Create a transporter and send:

   ```ts
   import nodemailer from "nodemailer";

   const transporter = nodemailer.createTransport({
     host: process.env.ZOHO_SMTP_HOST,
     port: Number(process.env.ZOHO_SMTP_PORT),
     secure: true, // true for port 465 (SSL)
     auth: {
       user: process.env.ZOHO_SMTP_USER,
       pass: process.env.ZOHO_SMTP_PASSWORD,
     },
   });

   await transporter.sendMail({
     from: `"Let Em Cook Contact" <${process.env.ZOHO_SMTP_USER}>`,
     to: "support@let-em-cook.io",
     subject: `Contact Form: Message from ${name}`,
     replyTo: email,
     text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
   });
   ```

   **Important:** The `from` address must match `ZOHO_SMTP_USER` — Zoho enforces this. Setting `replyTo` to the user's email means you can reply directly from your inbox and it goes to the user.

5. **Log the submission** — Insert a row into `ltc_contact_submissions`:

   ```sql
   INSERT INTO ltc_contact_submissions (user_id, user_email, user_name, message)
   VALUES (?, ?, ?, ?)
   ```

6. **Return success** — Return `{ success: true }` with status 200.

### Error handling:

- 400 for validation errors (with specific message about what's wrong)
- 401 for unauthenticated users
- 429 for rate limit exceeded
- 500 for email send failures (log the full error server-side)

---

## 5. Create the Contact Page

**File:** `src/app/contact/page.tsx`

This is a `"use client"` component that renders the contact form.

### Layout

Follow the same page structure as `create_recipe/page.tsx`:

```
<div className="min-h-screen bg-background">
  <div className="w-full max-w-5xl mx-auto px-4 pb-20 space-y-5">
    <!-- Header -->
    <!-- Form card -->
  </div>
</div>
```

### State

```ts
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [message, setMessage] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
```

### Pre-filling the email

Use the Clerk `useUser` hook to get the current user's email on mount:

```ts
import { useUser } from "@clerk/nextjs";

const { user, isLoaded } = useUser();

useEffect(() => {
  if (isLoaded && user) {
    setEmail(user.emailAddresses[0]?.emailAddress || "");
    setName(user.fullName || user.firstName || "");
  }
}, [isLoaded, user]);
```

The email input should be pre-filled but **read-only** (or at least pre-filled and editable if you want to allow alternate contact emails).

### Form fields

Use the same input styling as other forms in the project:

- **Name** — text input, pre-filled from Clerk
- **Email** — text input, pre-filled from Clerk, consider making it `readOnly`
- **Message** — textarea, same styling as the ingredients/instructions textareas

```
className="w-full px-2 py-2 border-2 border-border rounded-xl bg-surface text-text
           placeholder-text-secondary focus:outline-none focus:border-accent transition-colors"
```

### Submit handler

```ts
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error || "Failed to send message");
      return;
    }

    toast.success("Message sent successfully!");
    router.push("/dashboard");
  } catch (err) {
    toast.error("Failed to send message");
  } finally {
    setIsSubmitting(false);
  }
};
```

### CookingTips integration

Since this page has an `isSubmitting` state, you can add the `<CookingTips isVisible={isSubmitting} />` component here too.

### Buttons

Two buttons at the bottom, same style as other pages:

- **Send** — primary button, disabled while submitting, shows "Sending..." during submit
- **Cancel** — accent button, navigates back to `/dashboard`

---

## 6. Add the Dashboard Footer

**File:** `src/app/dashboard/page.tsx`

Add a footer inside the `DashboardContent` component, after the closing `</div>` of the main content area but still inside the outer `<div className="min-h-screen bg-background">`.

### Structure

```tsx
<footer className="w-full border-t-2 border-border bg-surface mt-10">
  <div className="max-w-5xl mx-auto px-4 py-6 flex justify-center">
    <button
      onClick={() => router.push("/contact")}
      className="text-text-secondary hover:text-text font-semibold transition-colors"
    >
      Contact
    </button>
  </div>
</footer>
```

Keep it minimal — a single "Contact" link for now. Other links can be added later by turning the `flex justify-center` into a `flex justify-center gap-8` and adding more buttons/links.

---

## 7. Testing Checklist

### Happy path

- [ ] Log in, go to dashboard, click "Contact" in footer
- [ ] Verify name and email are pre-filled from Clerk profile
- [ ] Type a message, click Send
- [ ] Verify CookingTips appears during submission (if added)
- [ ] Verify success toast appears
- [ ] Verify redirect to dashboard
- [ ] Check that the email arrived at `support@let-em-cook.io`
- [ ] Check that `ltc_contact_submissions` table has the new row

### Validation

- [ ] Submit with empty message — should show error
- [ ] Submit with message under 10 characters — should show error
- [ ] Submit with message over 2000 characters — should show error

### Rate limiting

- [ ] Submit 3 messages successfully
- [ ] Fourth message within 24 hours — should return 429 with "You can only send 3 messages per day"

### Auth

- [ ] Visit `/contact` while logged out — should redirect to sign in (handled by Clerk middleware)

### Mobile

- [ ] Form should be usable on mobile viewport
- [ ] Footer should be readable on mobile

---

## File Summary

| File                           | Action                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `.env.local`                   | Add `ZOHO_SMTP_HOST`, `ZOHO_SMTP_PORT`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASSWORD` |
| `src/app/api/contact/route.ts` | Create — API route with auth, validation, rate limiting, email send via Zoho  |
| `src/app/contact/page.tsx`     | Create — Contact form page with pre-filled fields                             |
| `src/app/dashboard/page.tsx`   | Modify — Add footer with Contact link                                         |
| Database                       | Run CREATE TABLE for `ltc_contact_submissions`                                |
