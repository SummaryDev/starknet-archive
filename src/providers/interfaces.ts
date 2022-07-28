import {BlockResponse} from "../types/types";
import {Abi} from "../../copy/types/raw-starknet";

export interface ApiProvider {
  getBlock(blockNumber: number): Promise<BlockResponse>

  getContractAbi(contractAddress: string): Promise<any>

  getClassAbi(classHash: string): Promise<any>

  callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string): Promise<string[] | undefined>
}

export interface AbiProvider {
  get(contractAddress: string, blockNumber: number, blockHash?: string): Promise<Abi | undefined>
}