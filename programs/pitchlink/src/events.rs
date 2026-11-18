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

#[event]
pub struct ClickRecorded {
    pub link_id: [u8; 16],
    pub creator: Pubkey,
    pub count: u64,
    pub ts: i64,
}
