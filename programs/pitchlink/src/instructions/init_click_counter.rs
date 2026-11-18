use anchor_lang::prelude::*;

use crate::errors::PitchlinkError;
use crate::state::*;

/// Creates the ClickCounter PDA for a tracked link. Called once, when the link
/// is minted. Pure counter setup — no auction or escrow state is touched.
#[derive(Accounts)]
#[instruction(link_id: [u8; 16])]
pub struct InitClickCounter<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ClickCounter::INIT_SPACE,
        seeds = [b"clicks", link_id.as_ref()],
        bump,
    )]
    pub click_counter: Account<'info, ClickCounter>,

    // Whoever funds the account — in practice the relayer wallet.
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitClickCounter>,
    link_id: [u8; LINK_ID_LEN],
    creator: Pubkey,
) -> Result<()> {
    require!(link_id != [0u8; LINK_ID_LEN], PitchlinkError::InvalidLinkId);

    let counter = &mut ctx.accounts.click_counter;
    counter.link_id = link_id;
    counter.count = 0;
    counter.creator = creator;
    counter.bump = ctx.bumps.click_counter;

    msg!(
        "Pitchlink click counter created: link_id={:?}, creator={}",
        link_id,
        creator
    );
    Ok(())
}
