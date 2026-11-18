/**
 * Pitchlink relayer — records clicks on a tracked link on devnet.
 *
 * The /go redirect calls increment_click once per click. It is permissionless,
 * so a funded relayer wallet signs and pays the fee; nothing about the auction
 * or escrow is touched.
 *
 * Usage:
 *   npx ts-node scripts/relayer-click.ts init <link_id> <creator_pubkey>
 *   npx ts-node scripts/relayer-click.ts click <link_id>
 *   npx ts-node scripts/relayer-click.ts read  <link_id>
 *
 * Env (see .env.example):
 *   RELAYER_KEYPAIR        path to the relayer keypair JSON (keep out of git)
 *   QUICKNODE_DEVNET_URL   RPC endpoint; falls back to clusterApiUrl("devnet")
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import * as anchor from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import idl from "../target/idl/pitchlink.json";

const LINK_ID_LEN = 16;
const DEFAULT_RELAYER_KEYPAIR = "~/.config/solana/pitchlink-relayer.json";

function expandHome(filePath: string): string {
  return filePath.startsWith("~")
    ? path.join(os.homedir(), filePath.slice(1))
    : filePath;
}

function loadRelayer(): Keypair {
  const keypairPath = expandHome(
    process.env.RELAYER_KEYPAIR ?? DEFAULT_RELAYER_KEYPAIR,
  );
  if (!fs.existsSync(keypairPath)) {
    throw new Error(
      `Relayer keypair not found at ${keypairPath}. Set RELAYER_KEYPAIR or run:\n` +
        `  solana-keygen new --no-bip39-passphrase -o ${DEFAULT_RELAYER_KEYPAIR}`,
    );
  }
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

/** Right-pads a short UTF-8 link id to the fixed [u8; 16] the program expects. */
function encodeLinkId(text: string): number[] {
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length === 0 || bytes.length > LINK_ID_LEN) {
    throw new Error(`link_id must be 1..${LINK_ID_LEN} UTF-8 bytes, got ${bytes.length}`);
  }
  const padded = Buffer.alloc(LINK_ID_LEN);
  bytes.copy(padded);
  return Array.from(padded);
}

function explorerTx(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

type ClickCounterAccount = {
  linkId: number[];
  count: anchor.BN;
  creator: PublicKey;
  bump: number;
};

type PitchlinkProgram = anchor.Program & {
  account: {
    clickCounter: { fetch(address: PublicKey): Promise<ClickCounterAccount> };
  };
};

function setup() {
  const relayer = loadRelayer();
  const endpoint = process.env.QUICKNODE_DEVNET_URL ?? clusterApiUrl("devnet");
  const connection = new Connection(endpoint, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(relayer),
    { commitment: "confirmed" },
  );
  const program = new anchor.Program(idl as anchor.Idl, provider) as PitchlinkProgram;

  const counterPda = (linkId: number[]): PublicKey =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("clicks"), Buffer.from(linkId)],
      program.programId,
    )[0];

  return { relayer, program, counterPda, endpoint };
}

async function main(): Promise<void> {
  const [command, linkIdText, creatorText] = process.argv.slice(2);
  if (!command || !linkIdText) {
    console.error(
      "usage: relayer-click.ts <init|click|read> <link_id> [creator_pubkey]",
    );
    process.exit(1);
  }

  const { relayer, program, counterPda, endpoint } = setup();
  const linkId = encodeLinkId(linkIdText);
  const clickCounter = counterPda(linkId);

  console.log(`rpc:       ${endpoint}`);
  console.log(`relayer:   ${relayer.publicKey.toBase58()}`);
  console.log(`link_id:   "${linkIdText}" (padded to ${LINK_ID_LEN} bytes)`);
  console.log(`counter:   ${clickCounter.toBase58()}`);

  if (command === "init") {
    if (!creatorText) throw new Error("init requires a creator pubkey");
    const creator = new PublicKey(creatorText);
    const signature = await program.methods
      .initClickCounter(linkId, creator)
      .accounts({
        clickCounter,
        payer: relayer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`initialized, creator=${creator.toBase58()}`);
    console.log(`tx:        ${explorerTx(signature)}`);
  } else if (command === "click") {
    const signature = await program.methods
      .incrementClick(linkId)
      .accounts({ clickCounter, clicker: relayer.publicKey })
      .rpc();
    const account = await program.account.clickCounter.fetch(clickCounter);
    console.log(`count:     ${account.count.toString()}`);
    console.log(`tx:        ${explorerTx(signature)}`);
  } else if (command === "read") {
    const account = await program.account.clickCounter.fetch(clickCounter);
    console.log(`count:     ${account.count.toString()}`);
    console.log(`creator:   ${account.creator.toBase58()}`);
  } else {
    throw new Error(`unknown command "${command}" (use init | click | read)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
