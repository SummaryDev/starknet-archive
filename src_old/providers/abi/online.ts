import { Abi, GetCodeResponse } from "../../types/raw-starknet";
import { Provider } from "starknet"
import { AbiProvider } from "../interfaces";

export class OnlineAbiProvider implements AbiProvider {
  constructor(private readonly provider: Provider) {}

  async get(contractAddress: string, blockNumber: number): Promise<Abi> {
    const getCodeResponse = await this.provider.getCode(contractAddress, blockNumber) as any
    const code = getCodeResponse as GetCodeResponse
    return code.abi
  }
}