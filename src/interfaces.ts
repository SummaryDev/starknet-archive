import {BlockResponse, Abi, OrganizedBlock} from "./types/types";

export interface ApiProvider {
  getBlock(blockNumber: number): Promise<BlockResponse>

  getContractAbi(contractAddress: string): Promise<any>

  getClassAbi(classHash: string): Promise<Abi>

  callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string): Promise<string[] | undefined>
}

export interface BlockProcessor {
  process(blockNumber: number): Promise<boolean>
}

export interface AbiProvider {
  get(contractAddress: string, blockNumber: number, blockHash?: string): Promise<Abi | undefined>
}

export interface ViewProvider {
  get(contractAddress: string, viewFunction: string, blockNumber?: number, blockHash?: string): Promise<string[] | undefined>
}

export interface BlockOrganizer {
  organizeBlock(blockResponse: BlockResponse): Promise<OrganizedBlock>
}