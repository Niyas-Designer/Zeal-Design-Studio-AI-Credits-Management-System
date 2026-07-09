# Zeal Design Studio AI Credits Management System

Production-ready React + Vite dashboard for AI credit purchases, invoice tracking, usage analytics, reports, payments, AI Studio, and role-based operations.

Production backend responsibilities:

- Firebase Authentication for login, signup, Google sign-in, sessions, password reset, and logout.
- Firestore `users` collection for auth user profile documents.
- Supabase PostgreSQL for all business data.
- Supabase Row Level Security for authorization.
- Supabase Realtime for admin-to-user updates.
- Supabase Storage for invoices, documents, and images.

Business data must not be stored in `localStorage`.

## Setup

1. Create or open the Supabase project.
2. Run the migration:

   ```bash
   supabase db push
   ```

   Or paste `supabase/migrations/202607090001_production_schema.sql` into the Supabase SQL editor.

3. Copy `.env.example` to `.env.local` and add Firebase + Supabase values:

   ```bash
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-firebase-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Firebase Authentication

In Firebase Console:

- Enable Email/Password authentication.
- Enable Google authentication.
- Add local and production domains to Authorized domains.
- Enable Firestore and create security rules for the `users` collection.

The first configured owner email is stored as `super_admin` in Firestore during profile creation.

## Commands

```bash
npm run lint
npm run build
npm run dev
```

## Production Notes

- Set Vercel Node.js to 22 because `pdfjs-dist` requires Node `>=22.13.0`.
- Add Firebase `VITE_FIREBASE_*` variables and Supabase `VITE_SUPABASE_*` variables to Vercel.
- Never expose the Supabase secret/service-role key in the Vite app.
- Configure Firebase authorized domains for local and production domains.
- Verify RLS and realtime before launch.

## Architecture

See [docs/production-supabase-architecture.md](docs/production-supabase-architecture.md) for:

- Architecture diagram
- ER diagram
- SQL migration details
- RLS policy summary
- Storage setup
- Realtime setup
- Security checklist
- Performance checklist
- Deployment checklist
- Final test report
