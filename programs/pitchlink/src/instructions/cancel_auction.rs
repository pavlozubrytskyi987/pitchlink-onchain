use anchor_lang::prelude::*;

use crate::errors::PitchlinkError;
use crate::state::*;

#[derive(Accounts)]
pub struct CancelAuction<'info> {
    // Auction PDA — only cancellable by its creator while there are no bids;
    // `close = creator` returns rent to the creator and zeros the account.
    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref()],
        bump = auction.bump,
        constraint = !auction.settled @ PitchlinkError::AlreadySettled,
        constraint = auction.creator == creator.key() @ PitchlinkError::NotCreator,
        constraint = auction.highest_bid == 0 @ PitchlinkError::AuctionHasBids,
        close = creator,
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Treasury PDA — holds no lamports at cancel time (no bids were placed).
    /// Included so its address is verified against the auction's PDA.
    #[account(
        mut,
        seeds = [b"treasury", auction.key().as_ref()],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<CancelAuction>) -> Result<()> {
    msg!("Pitchlink auction cancelled by creator");
    Ok(())
}
