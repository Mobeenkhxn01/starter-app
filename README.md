This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Gmail integration (read-only inbox)

Uses Better Auth for Google sign-in and Gmail read-only access. Google sign-in
requests `gmail.readonly`; email/password users can grant it later by clicking
**Connect Gmail**. Users separately opt in before an admin can view their inbox.

The admin panel is at `/admin`. Access is controlled by each user's database
`role` (`admin` or `user`); the initial admin account is promoted by the role
migration (`developermobeen7@gmail.com`). Admin access only covers users who connected Gmail and enabled
**Allow admin to view inbox** on the inbox page. They can revoke that permission
there. The panel displays sender, subject, date, and snippets, not message
bodies or attachments.

### Google Cloud setup
1. Create a project and enable the **Gmail API** (APIs & Services → Library).
2. OAuth consent screen → **Testing** mode → add your Google account under **Test users**.
3. Credentials → OAuth client ID (Web). Authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google`
4. Copy `.env.example` to `.env` and fill in the values.

> In Testing mode refresh tokens expire after 7 days; the app shows a "Reconnect Gmail" prompt when that happens.
> `gmail.readonly` is a *restricted* scope: a public launch needs Google OAuth verification + a CASA security assessment.

### Run
```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm dev
```
Then: sign in → Dashboard → **Open Gmail Inbox**. Users grant Gmail access and
choose whether to share it with the admin. The admin opens **Admin Gmail Panel**
from the Dashboard.

### Where things live
| File | Purpose |
| --- | --- |
| `src/lib/auth.ts` | Google provider (offline access), token encryption at rest |
| `src/lib/gmail/server.ts` | Token retrieval + Gmail API calls, Zod-validated, typed errors |
| `src/app/api/gmail/messages/route.ts` | `GET /api/gmail/messages?pageToken=&q=&limit=` |
| `src/app/api/admin/users/[userId]/messages/route.ts` | Admin-checked Gmail access for opted-in users |
| `src/hooks/use-inbox.ts` | TanStack Query infinite query (Axios) |
| `src/components/gmail/*` | Connect button + inbox UI |
| `src/app/inbox/page.tsx` | Protected page: connect prompt or inbox |
| `src/app/admin/page.tsx` | Admin-only list of users who shared Gmail access |
