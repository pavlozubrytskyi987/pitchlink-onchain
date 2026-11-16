use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::PitchlinkError;
use crate::events::Settled;
use crate::state::*;

#[derive(Accounts)]
pub struct SettleAuction<'info> {
    // Auction PDA — must not be already settled.
    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref()],
        bump = auction.bump,
        constraint = !auction.settled @ PitchlinkError::AlreadySettled,
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Treasury PDA holding the winning bid; drained to creator here.
    #[account(
        mut,
        seeds = [b"treasury", auction.key().as_ref()],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: The auction creator; address enforced to equal auction.creator.
    #[account(
        mut,
        constraint = creator.key() == auction.creator @ PitchlinkError::NotCreator,
    )]
    pub creator: UncheckedAccount<'info>,

    // Permissionless: any signer can settle after end_ts (pays the tx fee).
    #[account(mut)]
    pub settler: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<SettleAuction>) -> Result<()> {
    let auction = &ctx.accounts.auction;
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp >= auction.end_ts,
        PitchlinkError::AuctionStillActive
    );

    let winning_bid = auction.highest_bid;

    if winning_bid > 0 {
        let auction_key = ctx.accounts.auction.key();
        let treasury_bump = ctx.bumps.treasury;
        let treasury_seeds: &[&[u8]] = &[b"treasury", auction_key.as_ref(), &[treasury_bump]];

        // Treasury -> creator: full highest_bid (no protocol fee in Pitchlink demo).
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
                &[treasury_seeds],
            ),
            winning_bid,
        )?;
    }

    let winner = auction.highest_bidder;
    let auction = &mut ctx.accounts.auction;
    auction.settled = true;

    emit!(Settled {
        auction: ctx.accounts.auction.key(),
        winner,
        amount: winning_bid,
    });

    Ok(())
}
