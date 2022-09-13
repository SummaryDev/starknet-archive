import { Abi } from "../../types/raw-starknet";
import { AbiProvider, ApiProvider } from "../interfaces";

export class OnlineAbiProvider implements AbiProvider {
  constructor(private readonly provider: ApiProvider) {}

  async get(contractAddress: string, blockNumber: number): Promise<Abi | undefined> {
    return await this.provider.getContractAbi(contractAddress)
  }
}