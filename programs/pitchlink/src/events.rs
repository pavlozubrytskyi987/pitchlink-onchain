use anchor_lang::prelude::*;

#[event]
pub struct BidPlaced {
    pub auction: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub ts: i64,
}

#[event]
pub struct Settled {
    pub auction: Pubkey,
    pub winner: Pubkey,
    pub amount: u64,
}
