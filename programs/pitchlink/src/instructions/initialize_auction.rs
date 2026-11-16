use anchor_lang::prelude::*;

use crate::errors::PitchlinkError;
use crate::state::*;

#[derive(Accounts)]
pub struct InitializeAuction<'info> {
    // Auction PDA — one per creator; seeds match CONTRACT.md: [b"auction", creator].
    #[account(
        init,
        payer = creator,
        space = 8 + Auction::INIT_SPACE,
        seeds = [b"auction", creator.key().as_ref()],
        bump,
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Treasury PDA used as a SOL vault for escrowed bids.
    /// No data stored; address derived from auction key per CONTRACT.md.
    #[account(
        seeds = [b"treasury", auction.key().as_ref()],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    // The creator who opens and will receive payment on settlement.
    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeAuction>, end_ts: i64) -> Result<()> {
    let clock = Clock::get()?;
    require!(end_ts > clock.unix_timestamp, PitchlinkError::InvalidEndTs);

    let auction = &mut ctx.accounts.auction;
    auction.creator = ctx.accounts.creator.key();
    auction.end_ts = end_ts;
    auction.highest_bid = 0;
    auction.highest_bidder = Pubkey::default();
    auction.settled = false;
    auction.bump = ctx.bumps.auction;

    msg!(
        "Pitchlink auction opened: creator={}, end_ts={}",
        auction.creator,
        end_ts
    );
    Ok(())
}
