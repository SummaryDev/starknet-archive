import { Abi, Block, TransactionReceipt, Transaction } from "../types/raw-starknet";

export interface Api {
  getBlock(blockNumber: number): Promise<Block | undefined>

  getContractAbi(contractAddress: string, blockNumber?: number, blockHash?: string): Promise<Abi | undefined>

  getClassAbi(classHash: string): Promise<Abi | undefined>

  callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string): Promise<string[] | undefined>

  getTransactionReceipt(txHash: string): Promise<TransactionReceipt | undefined>

  getTransaction(txHash: string): Promise<Transaction | undefined>
}
