use anchor_lang::prelude::*;

#[error_code]
pub enum PitchlinkError {
    #[msg("Auction end timestamp must be in the future")]
    InvalidEndTs,

    #[msg("Auction has already ended")]
    AuctionEnded,

    #[msg("Auction is still active")]
    AuctionStillActive,

    #[msg("Auction has already been settled")]
    AlreadySettled,

    #[msg("Bid must be strictly greater than current highest bid")]
    BidTooLow,

    #[msg("Creator cannot bid on their own auction")]
    CreatorCannotBid,

    #[msg("Only the creator can cancel the auction")]
    NotCreator,

    #[msg("Cannot cancel an auction that already has bids")]
    AuctionHasBids,

    #[msg("Previous bidder account does not match the current highest bidder")]
    PreviousBidderMismatch,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Link id must not be all zero bytes")]
    InvalidLinkId,
}
