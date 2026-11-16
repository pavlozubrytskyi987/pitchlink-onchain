use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("EvJeVAfsJQ5tKR2RH4to2jgePPftg175H2re4Tw9V9AD");

#[program]
pub mod pitchlink {
    use super::*;

    /// Creator opens their ad-slot auction.
    pub fn initialize_auction(ctx: Context<InitializeAuction>, end_ts: i64) -> Result<()> {
        instructions::initialize_auction::handler(ctx, end_ts)
    }

    /// Brand places a bid. Must strictly exceed current highest_bid.
    /// Atomically refunds the previous highest bidder.
    pub fn place_bid(ctx: Context<PlaceBid>, amount: u64) -> Result<()> {
        instructions::place_bid::handler(ctx, amount)
    }

    /// After end_ts: pay highest_bid from treasury to creator, mark settled.
    pub fn settle_auction(ctx: Context<SettleAuction>) -> Result<()> {
        instructions::settle_auction::handler(ctx)
    }

    /// Creator cancels — only allowed while there are no bids.
    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        instructions::cancel_auction::handler(ctx)
    }
}
