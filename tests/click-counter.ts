import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";

const LINK_ID_LEN = 16;
const AIRDROP_LAMPORTS = 2 * LAMPORTS_PER_SOL;

type ClickCounterAccount = {
  linkId: number[];
  count: anchor.BN;
  creator: PublicKey;
  bump: number;
};

type PitchlinkProgram = anchor.Program & {
  account: {
    clickCounter: {
      fetch(address: PublicKey): Promise<ClickCounterAccount>;
    };
  };
};

/** Right-pads a short UTF-8 link id to the fixed [u8; 16] the program expects. */
function encodeLinkId(text: string): number[] {
  const bytes = Buffer.from(text, "utf8");
  assert.isAtMost(bytes.length, LINK_ID_LEN, "link id too long");
  const padded = Buffer.alloc(LINK_ID_LEN);
  bytes.copy(padded);
  return Array.from(padded);
}

describe("pitchlink click counter", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Pitchlink as PitchlinkProgram;
  const eventParser = new anchor.EventParser(program.programId, program.coder);

  function clickCounterPda(linkId: number[]): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("clicks"), Buffer.from(linkId)],
      program.programId,
    )[0];
  }

  async function fund(account: Keypair): Promise<void> {
    const signature = await provider.connection.requestAirdrop(
      account.publicKey,
      AIRDROP_LAMPORTS,
    );
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({ signature, ...latest }, "confirmed");
  }

  /** Reads the ClickRecorded events emitted by a confirmed transaction. */
  async function clickEventsOf(signature: string): Promise<anchor.Event[]> {
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({ signature, ...latest }, "confirmed");
    const tx = await provider.connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    assert.isNotNull(tx, "transaction not found");
    const logs = tx!.meta?.logMessages ?? [];
    return [...eventParser.parseLogs(logs)].filter((event) => event.name === "clickRecorded");
  }

  let relayer: Keypair;

  before(async () => {
    relayer = Keypair.generate();
    await fund(relayer);
  });

  async function initCounter(
    linkIdText: string,
    creator = Keypair.generate().publicKey,
  ): Promise<{ linkId: number[]; counter: PublicKey; creator: PublicKey }> {
    const linkId = encodeLinkId(linkIdText);
    const counter = clickCounterPda(linkId);

    await program.methods
      .initClickCounter(linkId, creator)
      .accounts({
        clickCounter: counter,
        payer: relayer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([relayer])
      .rpc();

    return { linkId, counter, creator };
  }

  async function increment(linkId: number[], counter: PublicKey): Promise<string> {
    return program.methods
      .incrementClick(linkId)
      .accounts({ clickCounter: counter, clicker: relayer.publicKey })
      .signers([relayer])
      .rpc();
  }

  it("init_click_counter creates the PDA with count = 0 and the credited creator", async () => {
    const { linkId, counter, creator } = await initCounter("chefdima-001");

    const account = await program.account.clickCounter.fetch(counter);
    assert.strictEqual(account.count.toNumber(), 0);
    assert.strictEqual(account.creator.toBase58(), creator.toBase58());
    assert.deepStrictEqual(account.linkId, linkId);
  });

  it("increment_click raises count to 3 after three clicks", async () => {
    const { linkId, counter } = await initCounter("chefdima-002");

    for (let i = 1; i <= 3; i += 1) {
      await increment(linkId, counter);
      const mid = await program.account.clickCounter.fetch(counter);
      assert.strictEqual(mid.count.toNumber(), i, `count after click ${i}`);
    }

    const account = await program.account.clickCounter.fetch(counter);
    assert.strictEqual(account.count.toNumber(), 3);
  });

  it("increment_click emits ClickRecorded with the new count, creator, and link_id", async () => {
    const { linkId, counter, creator } = await initCounter("chefdima-003");

    await increment(linkId, counter);
    const signature = await increment(linkId, counter);

    const events = await clickEventsOf(signature);
    assert.lengthOf(events, 1, "expected exactly one ClickRecorded event");

    const data = events[0].data as {
      linkId: number[];
      creator: PublicKey;
      count: anchor.BN;
      ts: anchor.BN;
    };
    assert.strictEqual(data.count.toNumber(), 2);
    assert.strictEqual(data.creator.toBase58(), creator.toBase58());
    assert.deepStrictEqual(data.linkId, linkId);
    assert.isAbove(data.ts.toNumber(), 0);
  });

  it("increment_click works for a signer that is not the payer or the creator", async () => {
    const { linkId, counter } = await initCounter("chefdima-004");
    const stranger = Keypair.generate();
    await fund(stranger);

    await program.methods
      .incrementClick(linkId)
      .accounts({ clickCounter: counter, clicker: stranger.publicKey })
      .signers([stranger])
      .rpc();

    const account = await program.account.clickCounter.fetch(counter);
    assert.strictEqual(account.count.toNumber(), 1);
  });

  it("init_click_counter rejects an all-zero link id", async () => {
    const linkId = Array.from(Buffer.alloc(LINK_ID_LEN));
    try {
      await program.methods
        .initClickCounter(linkId, Keypair.generate().publicKey)
        .accounts({
          clickCounter: clickCounterPda(linkId),
          payer: relayer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([relayer])
        .rpc();
      assert.fail("Expected InvalidLinkId to be returned");
    } catch (error) {
      assert.include(String(error), "InvalidLinkId");
    }
  });
});
