# Trader’s Journal App

## Overview
A modern trading journal and social platform for traders, featuring AI-powered insights, robust trade management, social sharing, and advanced analytics. Built with Next.js, Supabase, and a focus on security and data integrity.

---

## Features
- **User Authentication:** Secure login, registration, and account management via Supabase Auth.
- **Dashboard:** Central hub with widgets for AI Trading Insights, Top Down Analysis, Recent Trades, and Medal Achievements.
- **Trade Management:** Add, edit, and view detailed trade records with advanced stats.
- **Social Features:** Friends system, social forum, shared trades, comments, and likes.
- **Reports & Analytics:** Periodic trade reports (monthly, weekly, quarterly, yearly), export to Excel/Word.
- **Settings:** Notification preferences, display options, privacy controls.
- **Admin & Support:** Admin dashboard, support ticketing, and monitoring.

---

## Tech Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Shadcn/UI, Lucide icons
- **Backend:** Supabase (Postgres, Auth, Storage, RLS), Drizzle ORM, Zod validation
- **AI Integration:** Placeholder functions for future paid AI API
- **Email:** Resend for password reset and verification
- **File Storage:** Supabase Storage for screenshots and avatars

---

## Setup & Installation
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Traders-Journal
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Environment variables:**
   - Copy `.env.example` to `.env.local` and fill in Supabase, Resend, and (optionally) AI API keys.
4. **Supabase setup:**
   - Run migrations in `supabase/migrations/` on your Supabase project.
   - Set up storage buckets as listed in the schema.
   - Review and apply RLS policies as needed.
5. **Run the app locally:**
   ```bash
   npm run dev
   ```

---

## Deployment
- Set all environment variables in your deployment platform (Vercel, Netlify, etc.).
- Configure production domains, SSL, and CDN as needed.
- Set up error monitoring/logging (e.g., Sentry, LogRocket).

---

## Contribution Guidelines
- Use feature branches and submit pull requests for review.
- Follow the code style and type safety rules (TypeScript, Zod, Drizzle).
- Write clear commit messages and document any major changes.
- For Supabase schema changes, provide SQL scripts and request approval for new resources.

---

## Admin & Maintenance Notes
- **AI Integration:** Add your paid AI API key to the environment when ready. Replace stub functions in `/lib/grok.ts` with real API calls.
- **Cleanup:** Use provided SQL scripts and `/app/lib/database-cleanup.ts` for data cleanup after user/trade deletions.
- **RLS Policies:** Regularly review Supabase RLS for edge cases and update as needed.
- **Sensitive Data:** Ensure no sensitive data is exposed to the frontend. Use server-side functions for protected operations.
- **Legacy Code:** Periodically check for unused tables, columns, or code and clean up as needed.

---

## How to Add/Replace the AI API Key
1. Obtain your API key from your AI provider.
2. Add it to your `.env.local` as `AI_API_KEY=your_key_here`.
3. Update `/lib/grok.ts` to use the new provider’s API and data mapping.

---

## Support & Contact
For issues, feature requests, or support, please open an issue or contact the admin team. 