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

/// Fixed length of a tracked-link identifier, in bytes.
///
/// A short UTF-8 link id (e.g. "chefdima-001") is right-padded with zero bytes
/// to exactly this length. Fixed width keeps the PDA seed unambiguous and the
/// account size constant.
pub const LINK_ID_LEN: usize = 16;

/// On-chain click counter for one tracked link.
///
/// Fully independent of the auction accounts: no payment, escrow, or auction
/// logic touches this account.
///
/// PDA seeds: [b"clicks", link_id]
#[account]
#[derive(InitSpace)]
pub struct ClickCounter {
    /// Fixed-length identifier of the tracked link (zero-padded UTF-8).
    pub link_id: [u8; LINK_ID_LEN],

    /// Total clicks recorded for this link.
    pub count: u64,

    /// Creator the link credits (who the conversion belongs to).
    pub creator: Pubkey,

    /// Cached bump for the click counter PDA.
    pub bump: u8,
}
