import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";

const AIRDROP_LAMPORTS = 10 * LAMPORTS_PER_SOL;
const INITIAL_BID = new BN(1_000_000);
const HIGHER_BID = new BN(2_000_000);

type AuctionAccount = {
  creator: PublicKey;
  endTs: anchor.BN;
  highestBid: anchor.BN;
  highestBidder: PublicKey;
  settled: boolean;
};

type PitchlinkProgram = anchor.Program & {
  account: {
    auction: {
      fetch(address: PublicKey): Promise<AuctionAccount>;
    };
  };
};

describe("pitchlink", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Pitchlink as PitchlinkProgram;

  function auctionPda(creator: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("auction"), creator.toBuffer()],
      program.programId,
    )[0];
  }

  function treasuryPda(auction: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), auction.toBuffer()],
      program.programId,
    )[0];
  }

  async function fund(account: Keypair): Promise<void> {
    const signature = await provider.connection.requestAirdrop(
      account.publicKey,
      AIRDROP_LAMPORTS,
    );
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction(
      { signature, ...latest },
      "confirmed",
    );
  }

  async function createAuction(
    endTs = Math.floor(Date.now() / 1000) + 15,
  ): Promise<{ creator: Keypair; auction: PublicKey; treasury: PublicKey; endTs: number }> {
    const creator = Keypair.generate();
    const auction = auctionPda(creator.publicKey);
    const treasury = treasuryPda(auction);
    await fund(creator);

    await program.methods
      .initializeAuction(new BN(endTs))
      .accounts({
        auction,
        treasury,
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    return { creator, auction, treasury, endTs };
  }

  async function placeBid(
    auction: PublicKey,
    treasury: PublicKey,
    bidder: Keypair,
    amount: anchor.BN,
    previousBidder = bidder.publicKey,
  ): Promise<void> {
    await program.methods
      .placeBid(amount)
      .accounts({
        auction,
        treasury,
        previousBidder,
        bidder: bidder.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([bidder])
      .rpc();
  }

  async function expectProgramError(
    operation: () => Promise<unknown>,
    code: string,
  ): Promise<void> {
    try {
      await operation();
      assert.fail(`Expected ${code} to be returned`);
    } catch (error) {
      assert.include(String(error), code);
    }
  }

  async function waitUntilAfter(unixTimestamp: number): Promise<void> {
    // Wait against the validator's own clock, not wall time — the local
    // validator slot clock can trail real time by several seconds.
    while (true) {
      const slot = await provider.connection.getSlot();
      const chainTime = await provider.connection.getBlockTime(slot);
      if (chainTime !== null && chainTime > unixTimestamp) return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  it("initialize_auction sets creator, end_ts, highest_bid = 0, and settled = false", async () => {
    const { creator, auction, endTs } = await createAuction();

    const account = await program.account.auction.fetch(auction);
    assert.isTrue(account.creator.equals(creator.publicKey));
    assert.strictEqual(account.endTs.toNumber(), endTs);
    assert.isTrue(account.highestBid.eqn(0));
    assert.isFalse(account.settled);
  });

  it("place_bid rejects an amount less than or equal to highest_bid", async () => {
    const { auction, treasury } = await createAuction();
    const bidder = Keypair.generate();
    await fund(bidder);

    await expectProgramError(
      () => placeBid(auction, treasury, bidder, new BN(0)),
      "BidTooLow",
    );

    await placeBid(auction, treasury, bidder, INITIAL_BID);

    await expectProgramError(
      () => placeBid(auction, treasury, bidder, INITIAL_BID, bidder.publicKey),
      "BidTooLow",
    );
  });

  it("place_bid escrows lamports in the Treasury PDA and updates the highest bid", async () => {
    const { auction, treasury } = await createAuction();
    const bidder = Keypair.generate();
    await fund(bidder);

    await placeBid(auction, treasury, bidder, INITIAL_BID);

    const account = await program.account.auction.fetch(auction);
    assert.isTrue(account.highestBid.eq(INITIAL_BID));
    assert.isTrue(account.highestBidder.equals(bidder.publicKey));
    assert.strictEqual(
      await provider.connection.getBalance(treasury),
      INITIAL_BID.toNumber(),
    );
  });

  it("place_bid refunds the previous highest bidder when a higher bid replaces it", async () => {
    const { auction, treasury } = await createAuction();
    const firstBidder = Keypair.generate();
    const secondBidder = Keypair.generate();
    await Promise.all([fund(firstBidder), fund(secondBidder)]);

    await placeBid(auction, treasury, firstBidder, INITIAL_BID);
    const firstBidderAfterInitialBid = await provider.connection.getBalance(
      firstBidder.publicKey,
    );

    await placeBid(
      auction,
      treasury,
      secondBidder,
      HIGHER_BID,
      firstBidder.publicKey,
    );

    const firstBidderAfterRefund = await provider.connection.getBalance(
      firstBidder.publicKey,
    );
    assert.strictEqual(
      firstBidderAfterRefund - firstBidderAfterInitialBid,
      INITIAL_BID.toNumber(),
    );
  });

  it("settle_auction fails before end_ts, then pays the creator the highest_bid after end_ts", async () => {
    const endTs = Math.floor(Date.now() / 1000) + 3;
    const { creator, auction, treasury } = await createAuction(endTs);
    const bidder = Keypair.generate();
    const settler = Keypair.generate();
    await Promise.all([fund(bidder), fund(settler)]);
    await placeBid(auction, treasury, bidder, INITIAL_BID);

    await expectProgramError(
      () =>
        program.methods
          .settleAuction()
          .accounts({
            auction,
            treasury,
            creator: creator.publicKey,
            settler: settler.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([settler])
          .rpc(),
      "AuctionStillActive",
    );

    const creatorBalanceBeforeSettlement = await provider.connection.getBalance(
      creator.publicKey,
    );
    await waitUntilAfter(endTs);

    await program.methods
      .settleAuction()
      .accounts({
        auction,
        treasury,
        creator: creator.publicKey,
        settler: settler.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([settler])
      .rpc();

    const creatorBalanceAfterSettlement = await provider.connection.getBalance(
      creator.publicKey,
    );
    assert.strictEqual(
      creatorBalanceAfterSettlement - creatorBalanceBeforeSettlement,
      INITIAL_BID.toNumber(),
    );
  });

  it("cancel_auction succeeds with zero bids and fails after a bid exists", async () => {
    const emptyAuction = await createAuction();

    await program.methods
      .cancelAuction()
      .accounts({
        auction: emptyAuction.auction,
        treasury: emptyAuction.treasury,
        creator: emptyAuction.creator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([emptyAuction.creator])
      .rpc();

    assert.isNull(await provider.connection.getAccountInfo(emptyAuction.auction));

    const auctionWithBid = await createAuction();
    const bidder = Keypair.generate();
    await fund(bidder);
    await placeBid(
      auctionWithBid.auction,
      auctionWithBid.treasury,
      bidder,
      INITIAL_BID,
    );

    await expectProgramError(
      () =>
        program.methods
          .cancelAuction()
          .accounts({
            auction: auctionWithBid.auction,
            treasury: auctionWithBid.treasury,
            creator: auctionWithBid.creator.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([auctionWithBid.creator])
          .rpc(),
      "AuctionHasBids",
    );
  });
});
