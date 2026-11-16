use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::PitchlinkError;
use crate::events::BidPlaced;
use crate::state::*;

#[derive(Accounts)]
pub struct PlaceBid<'info> {
    // Auction PDA; seeds bind it to its creator so the frontend can't pass a fake account.
    #[account(
        mut,
        seeds = [b"auction", auction.creator.as_ref()],
        bump = auction.bump,
        constraint = !auction.settled @ PitchlinkError::AlreadySettled,
    )]
    pub auction: Account<'info, Auction>,

    /// CHECK: Treasury PDA that escrows the current highest bid in lamports.
    /// System-owned, no data; address is enforced by the seeds + bump.
    #[account(
        mut,
        seeds = [b"treasury", auction.key().as_ref()],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    /// CHECK: The previous highest bidder; validated in the handler against
    /// auction.highest_bidder before any refund transfer occurs.
    #[account(mut)]
    pub previous_bidder: UncheckedAccount<'info>,

    // New bidder — pays `amount` lamports into the treasury PDA.
    #[account(mut)]
    pub bidder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceBid>, amount: u64) -> Result<()> {
    let auction = &ctx.accounts.auction;
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp < auction.end_ts,
        PitchlinkError::AuctionEnded
    );
    require!(
        ctx.accounts.bidder.key() != auction.creator,
        PitchlinkError::CreatorCannotBid
    );
    // CONTRACT.md: amount must be STRICTLY greater than the current highest bid.
    require!(amount > auction.highest_bid, PitchlinkError::BidTooLow);

    // Move the new bid from bidder -> treasury PDA.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.bidder.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        amount,
    )?;

    // Atomic refund of the previous highest bidder, if any (preserves the base
    // auction-engine property: only one bid is ever held in escrow at a time).
    if auction.highest_bid > 0 {
        require_keys_eq!(
            ctx.accounts.previous_bidder.key(),
            auction.highest_bidder,
            PitchlinkError::PreviousBidderMismatch
        );

        let refund_amount = auction.highest_bid;
        let auction_key = ctx.accounts.auction.key();
        let treasury_bump = ctx.bumps.treasury;
        let treasury_seeds: &[&[u8]] = &[b"treasury", auction_key.as_ref(), &[treasury_bump]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: ctx.accounts.previous_bidder.to_account_info(),
                },
                &[treasury_seeds],
            ),
            refund_amount,
        )?;
    }

    let auction = &mut ctx.accounts.auction;
    auction.highest_bid = amount;
    auction.highest_bidder = ctx.accounts.bidder.key();

    emit!(BidPlaced {
        auction: ctx.accounts.auction.key(),
        bidder: ctx.accounts.bidder.key(),
        amount,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
