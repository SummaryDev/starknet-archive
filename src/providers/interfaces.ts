import { Abi, GetBlockResponse } from "starknet-parser/src/types/rawStarknet";

export interface BlockProvider {
  get(blockNumber: number): Promise<GetBlockResponse>
}

export interface ApiProvider {
  getBlock(blockNumber: number): Promise<GetBlockResponse>

  getAbi(contractAddress: string): Promise<Abi>

  callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string): Promise<string[]>
}

export interface ViewProvider {
  get(contractAddress: string, viewFunction: string, blockNumber?: number, blockHash?: string): Promise<string[]>
}
