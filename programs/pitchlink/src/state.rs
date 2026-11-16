use anchor_lang::prelude::*;

/// Auction account for a single creator's ad slot.
///
/// PDA seeds (from CONTRACT.md): [b"auction", creator_pubkey]
#[account]
#[derive(InitSpace)]
pub struct Auction {
    /// Creator who gets paid when the auction settles (the influencer).
    pub creator: Pubkey,

    /// Unix timestamp when the auction closes.
    pub end_ts: i64,

    /// Current highest bid in lamports (0 if no bids yet).
    pub highest_bid: u64,

    /// Current highest bidder (Pubkey::default() if no bids).
    pub highest_bidder: Pubkey,

    /// True once settle_auction has moved funds to the creator.
    pub settled: bool,

    /// Cached bump for the auction PDA.
    pub bump: u8,
}
