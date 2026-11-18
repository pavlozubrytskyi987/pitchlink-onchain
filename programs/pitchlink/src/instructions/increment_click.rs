use anchor_lang::prelude::*;

use crate::errors::PitchlinkError;
use crate::events::ClickRecorded;
use crate::state::*;

/// Records one click on a tracked link. Permissionless by design: the /go
/// redirect has a funded relayer sign and pay, and any signer is accepted.
#[derive(Accounts)]
#[instruction(link_id: [u8; 16])]
pub struct IncrementClick<'info> {
    #[account(
        mut,
        seeds = [b"clicks", link_id.as_ref()],
        bump = click_counter.bump,
    )]
    pub click_counter: Account<'info, ClickCounter>,

    // Any signer may record a click; pays only the transaction fee.
    pub clicker: Signer<'info>,
}

pub fn handler(ctx: Context<IncrementClick>, _link_id: [u8; LINK_ID_LEN]) -> Result<()> {
    let clock = Clock::get()?;
    let counter = &mut ctx.accounts.click_counter;

    counter.count = counter
        .count
        .checked_add(1)
        .ok_or(PitchlinkError::Overflow)?;

    emit!(ClickRecorded {
        link_id: counter.link_id,
        creator: counter.creator,
        count: counter.count,
        ts: clock.unix_timestamp,
    });

    Ok(())
}
