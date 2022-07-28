import { BlockProvider } from '../interfaces'
import { Cache } from "../../helpers/helpers";
import { GetBlockResponse } from "../../types/raw-starknet";

export class MockBlockProvider implements BlockProvider {
  private readonly cache: Cache<GetBlockResponse>

  constructor() {
    this.cache = new Cache<GetBlockResponse>()
  }

  async get(blockNumber: number) {
    return this.cache.get(blockNumber)
  }

  set(o: GetBlockResponse, blockNumber: number) {
    this.cache.set(o, blockNumber)
  }
}
