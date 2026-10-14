# CHOG MATE

A wallet-verified social discovery app for Chog Genesis NFT holders on Monad.

## Run & Operate

- `artifacts/chog-mate: web` — managed frontend workflow and browser preview
- `artifacts/api-server: API Server` — managed API workflow at `/api`
- `pnpm run typecheck` — typecheck workspace packages
- `pnpm --filter @workspace/chog-mate run typecheck` — typecheck the frontend
- `pnpm --filter @workspace/api-server run typecheck` — typecheck the API
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas after editing `lib/api-spec/openapi.yaml`
- Database schema is managed by Supabase; migration SQL is in `artifacts/chog-mate/supabase/migrations/`.

Required environment:

- Frontend: `VITE_WALLETCONNECT_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- API server: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`
- Optional live marketplace feed and collection statistics: `OPENSEA_API_KEY`
- Optional Monad RPC override: `MONAD_RPC_URL` (defaults to `https://rpc.monad.xyz`)

Keep `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, and `OPENSEA_API_KEY` server-side; never expose them through `VITE_` variables.

## Stack

- pnpm workspaces, Node.js, TypeScript 5.9
- API: Express 5
- Social persistence: Supabase Postgres with the service-role client restricted to the API server
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/chog-mate/src/pages/` — home, identity/profile/settings, discovery/matches/messages
- `artifacts/api-server/src/routes/` — auth, NFT, profile, and social HTTP routes
- `artifacts/api-server/src/lib/chogs.ts` — Monad Chog ownership verification and token metadata
- `artifacts/api-server/src/lib/opensea.ts` — OpenSea collection, recent sale, and statistics access
- `lib/api-spec/openapi.yaml` — source of truth for frontend/server API contracts
- `artifacts/chog-mate/supabase/migrations/` — database schema and policy migrations

## Architecture decisions

- Chog holder verification targets the NFT contract on Monad Mainnet; the separate `$CHOG` token is not an identity check.
- Collection browsing uses OpenSea's cursor API; wallet holdings use `tokensOfOwner` and verify each token with `ownerOf`.
- Marketplace-dependent sections show unavailable/empty states when OpenSea data is missing; they never substitute sample sales or metrics.
- OpenSea's collection stats endpoint does not provide a defined “top floor” metric, so CHOG MATE leaves that value unreported.

## Product

Verified Chog holders can create profiles, discover other holders, mutually match, and message matches. Users can browse the Chogs they own and select a profile Chog.

## User preferences

Use real chain/indexer data for NFTs and marketplace activity. Never seed fabricated production users, ownership, sales, statistics, matches, messages, balances, or call status.

## Gotchas

- Wallet sign-in needs the WalletConnect project ID and Supabase URL/anon key; persistent profiles and social actions also need the server-side Supabase service-role key.
- Marketplace sales and stats require the server-side `OPENSEA_API_KEY`; when absent, the UI must keep its explicit unavailable state.
- Regenerate API clients from OpenAPI before consuming new API response types.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
