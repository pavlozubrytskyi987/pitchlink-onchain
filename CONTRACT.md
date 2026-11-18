# PITCHLINK — SHARED CONTRACT (read this first, every agent)

This file is the single source of truth. Every agent works on a different
machine/account and CANNOT see the others' code. You coordinate ONLY through
this file and the program IDL. Do not invent names or shapes not written here.
If something is ambiguous, STOP and ask the human — do not guess.

## What we're building
Pitchlink: a pump.fun-style single-link ad auction for niche creators, on
Solana devnet, for the UBC 2026 hackathon.

A creator (e.g. a chef) has ONE link. Brands connect a wallet and bid SOL in a
timed English auction to win an ad placement on that creator's content. Bids
are escrowed on-chain. When the auction ends, the highest bid pays the creator,
and the winning brand's logo renders on the creator's page.

Positioning (for pitch, not code): OXAR rents objects (a van, a suitcase).
Pitchlink rents AUDIENCES — a creator's viewers, which convert far better than
a random object. One link turns any niche creator into a targeted, biddable
ad channel.

## DEMO SCOPE — build EXACTLY this, nothing more
- ONE creator, hardcoded: "Chef Dima", a mock profile page.
- ONE live auction at a time.
- Brands bid devnet SOL, escrowed in the program.
- Auction ends -> highest bidder wins -> SOL pays the creator.
- Winning brand's logo shows on the creator's page.
- Everything verifiable on Solana Explorer (devnet).

## DO NOT BUILD (these are pitch-deck vision, not code)
Multi-creator marketplace, real social/Instagram integration, accounts/login
(the wallet IS the identity), recurring auctions, Dutch/sealed-bid variants.

## STACK (non-negotiable)
- On-chain: Anchor 0.30, Rust, Solana devnet.
- Frontend: Next.js (app router) + TypeScript + Tailwind +
  @solana/wallet-adapter + @coral-xyz/anchor client.
- RPC: QuickNode devnet endpoint (the human will paste the URL into an env
  var QUICKNODE_DEVNET_URL). Fall back to clusterApiUrl('devnet') if unset.
- Repos: two separate repos.
    onchain/  -> the Anchor program (adapted from tedevans94/auction-engine)
    web/      -> the Next.js frontend

## THE PROGRAM INTERFACE — both repos code against THIS exact shape
We are adapting the open-source repo tedevans94/auction-engine (Anchor 0.30,
English auction, 4 instructions, atomic refund of previous bidder). We relabel
its domain from generic auction to "ad slot on a creator". Keep its working
escrow logic; change names and add nothing on-chain beyond what's below.

The program is NO LONGER auction-only: it also carries an on-chain click
counter (see "CLICK TRACKING" below). The two features are independent — the
click counter touches no auction account and holds no funds. Anything not
listed in this file still needs a human decision before it goes on-chain.

Program name: pitchlink

Accounts:
  Auction PDA   seeds = [b"auction", creator_pubkey]
    creator: Pubkey          // who gets paid (the influencer)
    end_ts: i64              // unix time the auction closes
    highest_bid: u64         // lamports
    highest_bidder: Pubkey   // current winning brand
    settled: bool
    bump: u8
  Treasury PDA  seeds = [b"treasury", auction_pubkey]
    // holds escrowed lamports only; no human holds the key

Instructions (names are FINAL — frontend depends on them):
  1. initialize_auction(end_ts: i64)
       creator opens their auction.
  2. place_bid(amount: u64)
       brand bids; require amount > highest_bid; refund the previous
       highest_bidder their lamports; move `amount` into Treasury PDA;
       update highest_bid / highest_bidder. (This atomic refund already
       exists in auction-engine — keep it.)
  3. settle_auction()
       after end_ts: transfer highest_bid lamports from Treasury to creator;
       set settled = true.
  4. cancel_auction()
       creator cancels only while there are no bids; close accounts.

Emit an event on place_bid and on settle_auction so the frontend can react:
  event BidPlaced  { auction: Pubkey, bidder: Pubkey, amount: u64, ts: i64 }
  event Settled    { auction: Pubkey, winner: Pubkey, amount: u64 }

## CLICK TRACKING (added after the auction shipped — part of the program now)
A brand wins an auction, gets a tracked link, and every click on that link is
recorded on-chain so a creator's real conversion is provable. Pure counter: no
payment, no escrow, no auction state.

Account:
  ClickCounter PDA  seeds = [b"clicks", link_id]
    link_id: [u8; 16]        // short UTF-8 link id, RIGHT-PADDED with zero bytes
    count: u64               // total clicks recorded
    creator: Pubkey          // who the link credits
    bump: u8

Instructions (names are FINAL — frontend depends on them):
  5. init_click_counter(link_id: [u8; 16], creator: Pubkey)
       creates the PDA with count = 0. Called once, when a tracked link is
       minted. Accounts: click_counter, payer (signer), system_program.
  6. increment_click(link_id: [u8; 16])
       count += 1. This is what the /go redirect calls on each click.
       PERMISSIONLESS — any signer is accepted; a funded relayer wallet signs
       and pays the fee. Accounts: click_counter, clicker (signer). No
       system_program.

Event:
  event ClickRecorded { link_id: [u8; 16], creator: Pubkey, count: u64, ts: i64 }

Frontend notes:
- Anchor camelCases in TS: initClickCounter / incrementClick / clickRecorded,
  and the account fields read as linkId / count / creator / bump.
- Pad the link id the same way on every call, or the PDA will not match:
    const b = Buffer.alloc(16); Buffer.from(text, "utf8").copy(b);
  link_id must be 1..16 UTF-8 bytes; an all-zero link_id is rejected
  (error InvalidLinkId).
- Relayer: scripts/relayer-click.ts in onchain/ drives init / click / read on
  devnet. Its keypair lives OUTSIDE the repo, at the path in RELAYER_KEYPAIR.

## THE IDL IS THE HANDOFF
When onchain/ compiles, it produces target/idl/pitchlink.json. That file is
the contract between repos, and it now carries the auction AND the click
instructions, accounts and events. The frontend imports it to call the program. The
human copies pitchlink.json from onchain/ into web/src/idl/ when it's ready.
Until then, the frontend works against a MOCK with these same names.

## OFF-LIMITS RULES
- Agents do NOT edit a repo they don't own.
- Nobody renames an instruction or account field without the human updating
  THIS file first and telling the other agents.
- Build in small steps; test each before the next; report and STOP at each
  checkpoint rather than running ahead.
- If a devnet airdrop fails or a version error appears, report the EXACT error
  text. Do not silently work around it.
