import { Abi, GetBlockResponse } from "../types/raw-starknet";

export interface BlockProvider {
  get(blockNumber: number): Promise<GetBlockResponse>
}

export interface ApiProvider {
  getBlock(blockNumber: number): Promise<GetBlockResponse>

  getContractAbi(contractAddress: string): Promise<Abi>

  getClassAbi(classHash: string): Promise<Abi>

  callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string): Promise<string[]>
}

export interface ViewProvider {
  get(contractAddress: string, viewFunction: string, blockNumber?: number, blockHash?: string): Promise<string[]>
}

export interface AbiProvider {
    get(contractAddress: string, blockNumber: number, blockHash?: string): Promise<Abi | undefined>
}