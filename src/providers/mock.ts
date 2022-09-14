import {Abi, Block, Transaction, TransactionReceipt} from "../types/raw-starknet";
import { ApiProvider } from "./interfaces";

export class MockApiProvider implements ApiProvider {
  constructor(private readonly abiCache: { [address: string]: Abi }) {}

  async getContractAbi(contractAddress: string, blockNumber: number) {
    return this.abiCache[contractAddress]
  }

  getBlock(blockNumber: number): Promise<Block | undefined> {
    throw new Error('not implemented')
  }

  getClassAbi(classHash: string): Promise<Abi | undefined> {
    throw new Error('not implemented')
  }

  callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string): Promise<string[] | undefined> {
    throw new Error('not implemented')
  }

  getTransactionReceipt(txHash: string): Promise<TransactionReceipt | undefined> {
    throw new Error('not implemented')
  }

  getTransaction(txHash: string): Promise<Transaction | undefined> {
    throw new Error('not implemented')
  }
}