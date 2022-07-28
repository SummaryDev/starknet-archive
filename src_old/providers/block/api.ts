import { BlockProvider, ApiProvider  } from "../interfaces";

export class ApiBlockProvider implements BlockProvider {
  constructor(private readonly provider: ApiProvider) {
  }

  async get(blockNumber: number) {
    return this.provider.getBlock(blockNumber)
  }
}
