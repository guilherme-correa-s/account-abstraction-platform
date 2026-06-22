---
name: Privy
description: Use when building authentication systems, embedded wallets, wallet controls, transaction signing, user onboarding, or wallet infrastructure for blockchain applications. Agents should reach for this skill when implementing user authentication, creating wallets, managing wallet policies, handling transactions, or integrating wallet functionality into applications.
metadata:
    mintlify-proj: privy
    version: "1.0"
---

# Privy Skill Reference

## Product summary

Privy is a wallet and authentication infrastructure platform for blockchain applications. It provides three core layers: **authentication** (email, SMS, social, passkeys, wallet login), **embedded wallets** (self-custodial wallets created and managed by Privy's infrastructure), and **controls** (policies and authorization keys that define who can access wallets and what actions they can perform).

Key files and endpoints:
- **Dashboard**: https://dashboard.privy.io (create apps, manage credentials, configure webhooks)
- **REST API**: `https://api.privy.io/v1/` (requires `appId:appSecret` basic auth)
- **Client SDKs**: React (`@privy-io/react-auth`), React Native (`@privy-io/expo`), Swift, Android, Flutter, Unity, Node.js, Java, Go, Rust, Ruby
- **Webhooks**: Configure at Dashboard > Configuration > Webhooks (requires Enterprise plan for production)
- **Primary docs**: https://docs.privy.io

## When to use

Reach for this skill when:
- **Authenticating users**: Implementing email/SMS/social/passkey/wallet login flows
- **Creating wallets**: Provisioning embedded wallets for users or servers on Ethereum, Solana, or 50+ other chains
- **Managing wallet access**: Setting up owners, signers, and authorization keys to control who can use wallets
- **Enforcing policies**: Creating rules that constrain transaction amounts, recipient addresses, contract interactions, or time windows
- **Handling transactions**: Signing and sending transactions, swaps, transfers, or earn actions
- **Integrating webhooks**: Reacting to user authentication, wallet creation, transaction lifecycle, or intent approval events
- **Migrating users**: Bulk importing users from existing systems with pre-generated wallets
- **Building multi-chain apps**: Supporting Ethereum, Solana, Cosmos, Stellar, Sui, Tron, Bitcoin, and other chains

## Quick reference

### SDK initialization (React)

```tsx
import {PrivyProvider} from '@privy-io/react-auth';

<PrivyProvider
  appId="your-privy-app-id"
  clientId="your-app-client-id"
  config={{
    embeddedWallets: {
      ethereum: {createOnLogin: 'users-without-wallets'}
    }
  }}
>
  {children}
</PrivyProvider>
```

### REST API authentication

All REST API calls require HTTP Basic Auth with `appId:appSecret`:

```bash
curl -u "appId:appSecret" https://api.privy.io/v1/wallets
```

### Core API endpoints

| Task | Endpoint | Method |
|------|----------|--------|
| Create wallet | `/v1/wallets` | POST |
| Get wallet | `/v1/wallets/{id}` | GET |
| Get user | `/v1/users/{id}` | GET |
| Create user | `/v1/users` | POST |
| Create policy | `/v1/policies` | POST |
| Get policy | `/v1/policies/{id}` | GET |
| Create key quorum | `/v1/key-quorums` | POST |
| Get transaction | `/v1/transactions/{id}` | GET |

### Wallet ownership models

| Model | Owner | Use case |
|-------|-------|----------|
| User-owned | User ID | Self-custodial consumer wallets |
| User + server | User ID + authorization key | Automated trading, limit orders |
| Application-owned | Authorization key | Treasury, bots, agents |
| Custodial | Licensed custodian | FBO banking model |

### Login methods

Email, SMS, WhatsApp, Google, Apple, Discord, Twitter, GitHub, LinkedIn, Spotify, Instagram, TikTok, Farcaster, Telegram, passkeys, wallet (SIWE/SIWS), custom OAuth.

### Supported chains (Tier 1)

Ethereum, Solana, Base, Optimism, Arbitrum, Polygon, Avalanche, Fantom, Celo, Gnosis, Harmony, Moonbeam, Moonriver, Linea, Scroll, Blast, Mantle, Manta, Zora, Fraxtal, Taiko, Worldchain, Degen, Ink, Lisk, Morph, Redstone, Sei, Skale, Starknet, Tempo, Tron, Bitcoin (Spark), and more.

## Decision guidance

### When to use Privy authentication vs. your own provider

| Scenario | Use Privy auth | Use your own + Privy wallets |
|----------|---|---|
| No existing auth system | ✓ | |
| Want email/SMS/social/passkey out-of-box | ✓ | |
| Have established auth (Auth0, Firebase, etc.) | | ✓ |
| Need to integrate existing user base | | ✓ |
| Want single provider for auth + wallets | ✓ | |

### When to use embedded wallets vs. external wallets

| Scenario | Embedded | External |
|----------|----------|----------|
| Onboarding new users | ✓ | |
| Users have existing wallets | | ✓ |
| Need seamless UX | ✓ | |
| Users want self-custody | ✓ | ✓ |
| Power users familiar with MetaMask | | ✓ |
| Server-side automation | ✓ | |

### When to use policies vs. signers

| Scenario | Use policies | Use signers |
|----------|---|---|
| Enforce transaction limits | ✓ | |
| Restrict recipient addresses | ✓ | |
| Allow server automation with scoped permissions | | ✓ |
| Prevent contract interactions | ✓ | |
| Delegate limited access to third party | | ✓ |
| Time-bound actions | ✓ | |

## Workflow

### 1. Set up your app

1. Create an account at https://dashboard.privy.io
2. Create a new app in Dashboard > Applications
3. Copy your **App ID** and **App Secret** (keep secret secure)
4. Configure allowed domains in Dashboard > Configuration > Allowed Domains
5. (Optional) Create app clients for different environments in Dashboard > App Clients

### 2. Implement authentication

**Client-side (React)**:
1. Wrap your app with `PrivyProvider` using your App ID
2. Use `useLogin()` or `useLoginWithEmail()` to authenticate users
3. Access authenticated user via `usePrivy()` hook
4. Check `ready` flag before consuming Privy state

**Server-side**:
1. Verify access tokens from client (optional)
2. Use REST API with appId:appSecret to query users by email, wallet, or custom auth

### 3. Create wallets

**Automatic** (recommended for new users):
1. Configure `embeddedWallets.ethereum.createOnLogin: 'users-without-wallets'` in PrivyProvider
2. Wallets are created automatically during login

**Manual** (client-side):
1. Call `useCreateWallet()` hook after user is authenticated
2. Specify chain type (ethereum, solana, etc.)
3. Optionally add signers or policies at creation time

**Server-side**:
1. Create user first via `/v1/users` (POST)
2. Create wallet via `/v1/wallets` (POST) with user ID as owner
3. Optionally attach policies via `policy_ids` parameter

### 4. Set up controls (optional)

**For user-owned wallets with server automation**:
1. Create authorization key (public key from p256 keypair)
2. Create key quorum via `/v1/key-quorums` (POST) with user ID + authorization key
3. Assign key quorum as additional signer to wallet
4. Create policy restricting signer's actions (e.g., max transfer amount)

**For application-owned wallets**:
1. Create authorization key (p256 public key)
2. Create wallet with authorization key as owner
3. Create policy defining allowed actions
4. Use server SDK to sign transactions with authorization key

### 5. Handle transactions

**Client-side (React)**:
1. Use `useSendTransaction()` (Ethereum) or `useSendTransaction()` from `@privy-io/react-auth/solana` (Solana)
2. Call `sendTransaction()` with transaction object
3. User signs in wallet UI

**Server-side**:
1. Call appropriate signing endpoint: `/v1/wallets/{id}/ethereum/eth_sendTransaction` (POST)
2. Include transaction data in request body
3. Sign request with authorization key if required
4. Privy returns transaction hash

### 6. Set up webhooks (production)

1. Create backend endpoint that accepts POST requests
2. Verify webhook signature using `privy.webhooks().verify()` (Node.js) or manually with Svix
3. Register endpoint in Dashboard > Configuration > Webhooks
4. Select event types to subscribe to (user.created, transaction.confirmed, etc.)
5. Handle webhook payload and return 2xx status

### 7. Verify your work

- [ ] App ID and secret are configured in environment variables
- [ ] PrivyProvider wraps your app at root level
- [ ] `ready` flag is checked before using Privy hooks
- [ ] Wallets are created for users (check Dashboard > Users)
- [ ] Transactions are signed and submitted (check Dashboard > Transactions)
- [ ] Policies are enforced (test with disallowed transaction)
- [ ] Webhooks are received and verified (check logs)
- [ ] Allowed domains are configured for your environment

## Common gotchas

- **Privy not ready**: Always check `usePrivy().ready` before consuming Privy state. Accessing state before ready can return stale data.
- **Missing app client**: If deploying to multiple domains, create app clients in Dashboard and pass `clientId` to PrivyProvider.
- **Wallet not created**: Automatic wallet creation only works if configured in PrivyProvider. Otherwise, manually call `createWallet()`.
- **Policy blocks all actions**: If a wallet has a policy but no rule for an RPC method, that method is denied by default. Add an "allow all" rule for methods you want to permit.
- **Webhook signature verification skipped**: Always verify webhook signatures before processing. Unverified webhooks can be spoofed.
- **Authorization key not signed**: Server-side wallet operations with authorization keys require signing the request with the private key. Use SDK helpers to avoid manual signing.
- **Rate limits on wallet creation**: Wallet creation endpoints are rate-limited. Implement exponential backoff for retries.
- **User loses only login method**: If a user has only one login method (e.g., social login) and that provider suspends their account, the user loses access permanently. Recommend users link backup methods (email, passkey).
- **Policies not evaluated in enclave**: Policies are evaluated in Privy's secure enclaves at signing time, not on your server. You cannot inspect or modify policy evaluation.
- **External wallets not embedded**: External wallets (MetaMask, Phantom) are not embedded in your app—they open in a separate window. UX differs from embedded wallets.

## Verification checklist

Before submitting work with Privy:

- [ ] App ID and App Secret are stored securely (environment variables, not hardcoded)
- [ ] PrivyProvider is initialized with correct appId and config
- [ ] Allowed domains are configured in Dashboard for your environment
- [ ] User authentication flow works end-to-end (login, logout, session persistence)
- [ ] Wallets are created and accessible via `useWallets()` or API
- [ ] Transactions can be signed and submitted (test with small amount)
- [ ] Policies are attached to wallets and enforced (test with disallowed action)
- [ ] Webhook endpoint is registered and receives events (test with Dashboard test button)
- [ ] Webhook signatures are verified before processing
- [ ] Error handling is in place for failed transactions and API errors
- [ ] Rate limiting is handled with exponential backoff
- [ ] User backup login methods are recommended (if using social login)

## Resources

**Comprehensive navigation**: https://docs.privy.io/llms.txt

**Critical documentation**:
1. [Getting started](https://docs.privy.io/basics/get-started/about) — Overview of Privy's three layers
2. [React SDK setup](https://docs.privy.io/basics/react/setup) — PrivyProvider configuration and initialization
3. [REST API introduction](https://docs.privy.io/api-reference/introduction) — API authentication and rate limits
4. [Wallets overview](https://docs.privy.io/wallets/overview) — Embedded vs. external wallets
5. [Controls overview](https://docs.privy.io/controls/overview) — Owners, signers, and policies
6. [Webhooks overview](https://docs.privy.io/api-reference/webhooks/overview) — Setting up and verifying webhooks

---

> For additional documentation and navigation, see: https://docs.privy.io/llms.txt