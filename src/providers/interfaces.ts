import { Abi, GetBlockResponse } from "../types/raw-starknet";

export interface BlockProvider {
  get(blockNumber: number): Promise<GetBlockResponse | undefined>
}

export interface ApiProvider {
  getBlock(blockNumber: number): Promise<GetBlockResponse | undefined>

  getContractAbi(contractAddress: string): Promise<Abi | undefined>

  getClassAbi(classHash: string): Promise<Abi | undefined>

  callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string): Promise<string[] | undefined>
}

export interface ViewProvider {
  get(contractAddress: string, viewFunction: string, blockNumber?: number, blockHash?: string): Promise<string[] | undefined>
}

export interface AbiProvider {
    get(contractAddress: string, blockNumber: number, blockHash?: string): Promise<Abi | undefined>
}