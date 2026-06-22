# Account Abstraction Platform

Web-responsive smart-account wallet. A user signs in with **Privy** (email /
social / wallet), their embedded EOA is upgraded to a **Kernel** smart account
via **EIP-7702**, and from there they can swap, cross-swap, transfer, batch
swaps into a single signature, manage social recovery, view balances/history,
and export their signer key. Gas is sponsored by a **Pimlico** paymaster; swaps
and cross-chain swaps are routed by **Relay**. Primary chain: **Polygon**.

> Design + integration spec lives in [`design_handoff_aa_platform/`](./design_handoff_aa_platform).
> The `.dc.html` there is the interactive visual reference.

## Stack

| Concern                | Library                              |
| ---------------------- | ------------------------------------ |
| Framework              | Next.js 16 (App Router) + TypeScript |
| Styling                | Tailwind CSS v4 + shadcn/ui          |
| Auth + embedded signer | `@privy-io/react-auth`               |
| Smart account (7702)   | `@zerodev/sdk` + `@zerodev/ecdsa-validator` |
| Bundler + paymaster    | `permissionless` (Pimlico)           |
| Swaps + cross-swaps    | `@reservoir0x/relay-sdk`             |
| Chain primitives       | `viem` (Polygon, Base, Arbitrum, Optimism) |

## Getting started

```bash
cp .env.example .env.local   # fill in Privy / Pimlico / Alchemy keys
npm run dev                  # http://localhost:3000
```

The app boots without keys (Privy is skipped with a console warning) so you can
work on UI before wiring providers.

## Project layout

```
app/                       App Router
  layout.tsx               Fonts (IBM Plex Sans/Mono) + <Providers>
  providers.tsx            "use client" — loads web3 providers with ssr:false
  page.tsx                 Placeholder (no screens yet)
  globals.css              Design tokens (Tailwind v4 @theme) + keyframes
components/
  providers/web3-providers.tsx   "use client" — PrivyProvider (+ future clients)
config/chains.ts           viem chains (Polygon primary + cross-swap chains)
lib/utils.ts               cn() helper (shadcn)
components.json            shadcn/ui config
next.config.ts             transpilePackages + webpack polyfills for web3
```

Providers are loaded **client-side only** (`next/dynamic`, `ssr: false`) so
browser-only APIs (`window`, `indexedDB`, Privy's iframe) never run on the
server.
