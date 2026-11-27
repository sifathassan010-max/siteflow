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

## Shopify product catalog (Stage 3)

- Run `supabase/schema-chatbot-v11.sql` once in the Supabase SQL Editor **before** deploying this code.
- Bot settings -> "Shopify products": import by store address (reads `{store}/products.json`), or upload a Shopify product-export CSV (parsed in the browser, uploaded in batches of 250).
- Max 2,000 products per bot (trial: 100). Product link = the store address you entered + `/products/<handle>`.
- At chat time only the best-matching products (Postgres full-text search, top 8) are put into the prompt as an untrusted-data block. Replies of bots with a catalog may only link to hosts the bot was given.

## Stage 4 — referral tier + affiliate commission

- `src/lib/patreon-config.ts`: set `REFERRAL_TIER_TITLE` (exact Patreon tier name) and `PATREON_REFERRAL_JOIN_URL`. Until both are set, `/pricing` shows $39.99 to everyone.
- Webhook stores what each customer pays (`subscriptions.paid_amount_cents`) and sends it to the affiliate site, which pays 30% of it every month.
- A referral-tier buyer with no referrer keeps access and is listed in the `referral_tier_flags` table for review.
- Run `supabase/schema-chatbot-v12.sql` once before deploying.
