import { BlockProvider } from '../interfaces'
import { Cache } from "../../helpers/helpers";
import { Block } from "../../types/raw-starknet";

export class MockBlockProvider implements BlockProvider {
  private readonly cache: Cache<Block>

  constructor() {
    this.cache = new Cache<Block>()
  }

  async get(blockNumber: number) {
    return this.cache.get(blockNumber)
  }

  set(o: Block, blockNumber: number) {
    this.cache.set(o, blockNumber)
  }
}
