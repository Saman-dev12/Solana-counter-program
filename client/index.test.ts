import { expect, describe, test, beforeAll } from "bun:test";
import * as borsh from "borsh";
import {
  Keypair,
  Connection,
  clusterApiUrl,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {program_address} from "./constant.ts"
// --- Data Structures (Corrected for Borsh) ---

// This class represents the account's state. This part was already correct.
class Counter {
  data: number = 0;
  constructor(fields: { data: number } | undefined = undefined) {
    if (fields) {
      this.data = fields.data;
    }
  }
}

const CounterSchema = new Map([
  [Counter, { kind: "struct", fields: [["data", "u32"]] }],
]);

// This new class correctly represents the structure of our on-chain enum.
// An instance of this class will have ONE of these fields defined.
class Instruction {
  Initialize?: { value: number };
  Increment?: { value: number };
  Decrement?: { value: number };

  constructor(properties: {
    Initialize?: { value: number };
    Increment?: { value: number };
    Decrement?: { value: number };
  }) {
    Object.assign(this, properties);
  }
}

// The schema now maps the new Instruction class to the enum definition.
const InstructionSchema = new Map([
  [
    Instruction,
    {
      kind: "enum",
      field: "enum", // This tells borsh which key to use to determine the variant
      values: [
        // The variant name must match the key in the Instruction class instance
        ["Initialize", { kind: "struct", fields: [["value", "u32"]] }],
        ["Increment", { kind: "struct", fields: [["value", "u32"]] }],
        ["Decrement", { kind: "struct", fields: [["value", "u32"]] }],
      ],
    },
  ],
]);

// --- Test Suite ---

describe("Counter program", () => {
  let connection: Connection;
  let userKeypair: Keypair;
  let counterKeypair: Keypair;
  let programId: PublicKey;

  beforeAll(async () => {
    programId = new PublicKey(program_address); // 👈 Replace this!
    connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    userKeypair = Keypair.generate();
    counterKeypair = Keypair.generate();
    await connection.requestAirdrop(userKeypair.publicKey, 1 * LAMPORTS_PER_SOL);
  });

  test("should create the counter account and initialize it", async () => {
    const space = 4;
    const lamports = await connection.getMinimumBalanceForRentExemption(space);

    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: userKeypair.publicKey,
      newAccountPubkey: counterKeypair.publicKey,
      lamports,
      space,
      programId,
    });
    
    // Create the instruction data with the CORRECT structure
    const initInstruction = new Instruction({ Initialize: { value: 10 } });
    const initBuffer = Buffer.from(borsh.serialize(InstructionSchema, initInstruction));

    const initializeInstruction = {
      keys: [{ pubkey: counterKeypair.publicKey, isSigner: false, isWritable: true }],
      programId: programId,
      data: initBuffer,
    };
    
    const transaction = new Transaction().add(createAccountInstruction, initializeInstruction);
    await sendAndConfirmTransaction(connection, transaction, [userKeypair, counterKeypair]);

    const accountInfo = await connection.getAccountInfo(counterKeypair.publicKey);
    const counterState = borsh.deserialize(CounterSchema, Counter, accountInfo!.data);
    
    expect(counterState.data).toBe(10);
  });
  
  test("should increment the counter's value", async () => {
    // Create the instruction data with the CORRECT structure
    const incrementInstruction = new Instruction({ Increment: { value: 5 } });
    const incrementBuffer = Buffer.from(borsh.serialize(InstructionSchema, incrementInstruction));
    
    const transaction = new Transaction().add({
      keys: [{ pubkey: counterKeypair.publicKey, isSigner: false, isWritable: true }],
      programId: programId,
      data: incrementBuffer,
    });
    
    await sendAndConfirmTransaction(connection, transaction, [userKeypair]);
    
    const accountInfo = await connection.getAccountInfo(counterKeypair.publicKey);
    const counterState = borsh.deserialize(CounterSchema, Counter, accountInfo!.data);
    
    expect(counterState.data).toBe(15);
  });
  
  test("should decrement the counter's value", async () => {
    // Create the instruction data with the CORRECT structure
    const decrementInstruction = new Instruction({ Decrement: { value: 3 } });
    const decrementBuffer = Buffer.from(borsh.serialize(InstructionSchema, decrementInstruction));
    
    const transaction = new Transaction().add({
      keys: [{ pubkey: counterKeypair.publicKey, isSigner: false, isWritable: true }],
      programId: programId,
      data: decrementBuffer,
    });
    
    await sendAndConfirmTransaction(connection, transaction, [userKeypair]);
    
    const accountInfo = await connection.getAccountInfo(counterKeypair.publicKey);
    const counterState = borsh.deserialize(CounterSchema, Counter, accountInfo!.data);
    
    expect(counterState.data).toBe(12);
  });
});
