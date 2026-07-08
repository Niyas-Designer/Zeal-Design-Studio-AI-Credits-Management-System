# Zeal Design Studio AI Credits Management System

A React + Vite internal dashboard with Supabase Authentication, PostgreSQL data storage, RBAC, AI usage tracking, reporting, and payment management.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and add your Supabase project values.
4. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Authentication

- Signup uses Supabase Auth with full name, email, password, and confirm password validation.
- Password hashing and session persistence are handled by Supabase Auth.
- The first registered user becomes `admin`; later signups become `user`.
- Disabled users are blocked after authentication by the profile check.

## Login Email Notifications

Login notifications are implemented in:

```text
supabase/functions/login-notification/index.ts
```

Deploy it and set these Edge Function secrets:

```bash
supabase functions deploy login-notification
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set LOGIN_EMAIL_FROM="Zeal App <login@yourdomain.com>"
```

Every successful login invokes the function and sends a notification to `niyas.zealdesigner@gmail.com`.

## RBAC

Admin users can access:

- Dashboard
- AI Usage
- Reports
- Payments
- User Management

Regular users can access:

- Dashboard scoped to their data
- AI Usage scoped to their data
- Reports scoped to their data
- Payments scoped to their data
- Logout

RLS policies in `supabase/schema.sql` enforce owner/admin boundaries at the database level.

## Payments

The Payments module supports:

- UPI
- Credit Card
- Debit Card
- Net Banking
- Bank Transfer

Admins can view all payment records. Users only see their own records.
