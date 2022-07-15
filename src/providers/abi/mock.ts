import { Abi } from "../../types/raw-starknet";
import { AbiProvider } from "../interfaces";

export class MockAbiProvider implements AbiProvider {
  constructor(private readonly abiCache: { [address: string]: Abi }) {}

  async get(contractAddress: string, blockNumber: number) {
    return this.abiCache[contractAddress]
  }
}