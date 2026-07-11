# Zeal Design Studio AI Credits Management System

Offline-only React + Vite dashboard for AI credit purchases, invoice tracking, usage analytics, reports, payments, AI Studio, and local admin operations.

This version is frontend-only and runs on localhost. It has no backend SDKs, server functions, remote database, remote storage, or backend environment variables.

## Local Login

- Local admin email: `niyas.zealdesigner@gmail.com`
- Predefined password: `@arddesign6Z`
- Session key: `zeal_offline_authenticated`
- Local database key: `zeal_offline_local_database_v1`
- One local password only. There are no account creation or remote identity flows.

The session remains active in `localStorage` until Logout is clicked.

## Local Data

All business data is saved in browser `localStorage`:

- AI usage
- Credit purchases
- Payments
- Credit ledger
- Reports data
- Invoice file metadata/data URLs
- AI Studio catalog changes
- Local user profile and preferences

The local store is loaded automatically at startup, saved after each change, and reset safely if corrupted JSON is detected.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm run lint
npm run build
npm run dev
```

## Offline Notes

- Build artifacts are static frontend files.
- No backend `.env` file is required.
- Exports run entirely in the browser.
- PDF invoice parsing and OCR use bundled/local worker assets.
- External links in AI Studio are informational and only open if the user clicks them.
