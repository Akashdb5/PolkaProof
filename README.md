# PolkaProof

HealthChain’s PolkaProof is our submission for the **“Bring Web2 Applications to Web3”** track of the Polkadot Hackathon. The dApp shows how a familiar, Web2-style event workflow—RSVP, QR check-in, and badge collection—can be upgraded with Polkadot-native identity, verifiable proofs, and interoperable NFT rewards without forcing attendees to abandon the UX they know.

## Project Goals

- **User-Centric Proof of Attendance** – allow hackathon or meetup organizers to issue tamper-proof check-ins backed by Polkadot wallets, Supabase persistence, and REST APIs that feel Web2-native.
- **Hybrid Wallet Support** – require a Polkadot extension to sign the attendance proof while optionally capturing a MetaMask reward address so organizers can deliver EVM NFTs later.
- **Radically Open Stack** – build on Polkadot SDK tooling (`@polkadot/api`, extensions, pallet-nfts) plus Vercel-friendly Next.js routes so the same service can mint badges, call upstream RPCs, and share data over standard JSON APIs.

## Why This Matters for the Hackathon

| Theme | Contribution |
| --- | --- |
| **User-centric Apps** | Wallet-gated flows that keep users in control of their identity and provide transparent proofs stored on Polkadot-friendly infrastructure. |
| **Polkadot Tinkerers** | Combines Supabase, Pinata/IPFS, pallet-nfts, and PolkaVM contract metadata to demonstrate cross-stack orchestration. |
| **Bridge Web2 → Web3** | Organizer APIs mirror conventional REST services (cURL examples included) so any Web2 backend can call them without relearning blockchain primitives. |

## High-Level Architecture

1. **Next.js 14 App Router** renders landing pages, event listings, check-in flows, and profile dashboards.
2. **WalletGate component** loads Polkadot.js/Talisman/Subwallet extensions for sr25519 signatures and MetaMask for optional reward addresses.
3. **API Routes (Edge-friendly)** handle attendance verification, profile updates, badge minting, Pinata uploads, and PolkaVM contract metadata introspection.
4. **Supabase (Postgres + RLS)** stores events, attendance, badges, and the linked MetaMask addresses (`profiles.evm_address`).
5. **Substrate RPC / Pallet-nfts** mint on-chain badge items, while Pinata persists metadata and art referenced by the UI.

```
Browser (Next.js + WalletGate)
 ├─ /events/[id]/checkin → Polkadot signRaw → POST /api/attendance
 ├─ /profile → GET /api/profile/:address + PATCH profile updates
 └─ Organizer cURL → /api/badges/* + Pinata helpers

Backend (Next.js Routes)
 ├─ Validates signatures via @polkadot/util-crypto
 ├─ Persists attendance + MetaMask reward addresses in Supabase
 └─ Calls Polkadot RPC (pallet-nfts) and Pinata for badge minting
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+
- npm (preinstalled with Node)
- Access to Supabase (or Postgres) and Pinata credentials
- Polkadot RPC endpoint capable of pallet-nfts (e.g., `wss://westend-rpc.polkadot.io`)

### 2. Install Dependencies

```bash
git clone https://github.com/Akashdb5/PolkaProof.git
cd PolkaProof
npm install
```

### 3. Environment Configuration

Copy `.env.example` → `.env.local` (or `.env`) and fill in:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase credentials. |
| `ORGANIZER_API_KEY` / `BADGE_ORGANIZER_KEY` | Shared secret for organizer-only routes. |
| `BADGE_RPC_ENDPOINT`, `BADGE_ADMIN_MNEMONIC`, `BADGE_COLLECTION_ID` | Pallet-nfts RPC + signer and target collection. |
| `PINATA_JWT` or `PINATA_API_KEY`/`PINATA_SECRET_API_KEY` | For uploading badge metadata/art to IPFS. |
| `POLKADOT_WS_URL`, `NEXT_PUBLIC_POLKADOT_WS_URL`, `CONTRACT_ADDRESS`, `CONTRACT_METADATA_PATH` | Optional PolkaVM contract metadata served at `/api/contracts/healthchain`. |
| `NEXT_PUBLIC_APP_URL`, `REDIS_URL`, `DATABASE_URL` | Runtime config (Redis optional). |

Remember to set `CONTRACT_METADATA_PATH` to a repo-relative path such as `public/contracts/healthchain_polkavm.json` so Next.js can read it at build time.

### 4. Database Migrations

Apply the Supabase migrations in order:

```bash
psql "$SUPABASE_URL" < supabase/migrations/0001_initial.sql
psql "$SUPABASE_URL" < supabase/migrations/0002_profile_badges.sql
psql "$SUPABASE_URL" < supabase/migrations/0003_badge_chain_metadata.sql
psql "$SUPABASE_URL" < supabase/migrations/0004_profile_evm_address.sql
```

The final migration adds `profiles.evm_address` so MetaMask accounts captured during attendance can be referenced when issuing NFTs on EVM chains.

## Usage

### Development

```bash
npm run dev
# visit http://localhost:3000
```

### Production Build

```bash
npm run build
npm run start
```

### Check-In Flow (Attendees)

1. Visit `/events/[eventId]/checkin`.
2. Connect a **Polkadot wallet** (Polkadot.js, Talisman, Subwallet). This wallet signs the canonical attendance message via `signRaw`.
3. Optionally connect **MetaMask**; the UI saves the EVM address to your profile for later NFT drops.
4. Click “Submit signature.” The backend:
   - Validates the sr25519/ed25519 signature with `@polkadot/util-crypto`.
   - Stores the nonce, timestamp, and optional MetaMask address in Supabase.
   - Marks attendance as confirmed.

### Organizer API Highlights

| Endpoint | Description |
| --- | --- |
| `POST /api/badges/mint` | Mint a single badge. Requires bearer `BADGE_ORGANIZER_KEY`. |
| `POST /api/badges/batch-mint` | Mint multiple badges sequentially. |
| `POST /api/badges/upload` | Upload base64 badge art to Pinata and return a CID. |
| `GET /api/badges/collection` | Inspect or create the pallet-nfts collection metadata. |
| `POST /api/event` | Create/update event metadata used by the check-in UI. |

Sample cURL (single mint):

```bash
curl -X POST http://localhost:3000/api/badges/mint \
  -H "Authorization: Bearer $BADGE_ORGANIZER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
        "participantAddress": "5F......",
        "participantName": "Alice",
        "eventId": "dotcon-2025",
        "eventName": "DOTCon 2025",
        "metadata": { "tier": "gold" }
      }'
```

Badge metadata and images are uploaded to Pinata/IPFS, and the response includes the block hash, collection/item IDs, and gateway URLs so you can verify the mint on-chain.

### Profiles & Rewards

- `/profile` lets attendees view badges, update their display data, and confirm which Polkadot wallet they control.
- If they connected MetaMask during attendance, `profiles.evm_address` is shown so organizers know where to send EVM NFTs or ERC-6551 drops.

## Technologies & Dependencies

| Layer | Libraries & Services |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, dynamic imports for wallet panels. |
| State & Wallets | Zustand for wallet state, `@polkadot/extension-dapp` for Polkadot accounts, MetaMask via the `window.ethereum` provider. |
| Web3 / Backend | `@polkadot/api`, `@polkadot/util-crypto`, `@polkadot/keyring`; optional PolkaVM contract metadata served from `public/contracts`. |
| Storage | Supabase (Postgres + RLS) for profiles, events, attendance, badges; Redis (optional) for caching; Pinata/IPFS for badge art. |
| Badge Minting | Pallet-nfts via Substrate RPC, `scripts/createCollection.js` helper for initializing collections. |

## Next Steps & Ideas

- **EVM Airdrop Service** – use the captured MetaMask addresses to trigger ERC-721 or ERC-1155 drops on Moonbeam or an EVM testnet.
- **On-chain Analytics** – export Supabase data into a cross-chain dashboard to highlight attendance streaks, reward eligibility, and badge rarity.
- **Custom Themes** – adapt the UI copy/branding to other hackathon tracks while keeping the wallet + API infrastructure intact.
