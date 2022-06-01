import {GetBlockResponse, Abi} from "starknet-parser/src/types/rawStarknet"
import {AbiProvider} from "starknet-parser/lib/organizers/AbiProvider"
import {Provider} from "starknet"
import {BlockNumber} from "starknet/src/types/lib";
import * as console from 'starknet-parser/lib/helpers/console'
import {DataSource, Repository} from "typeorm";
import {BlockEntity, RawBlock, RawBlockEntity, RawAbi, RawAbiEntity} from "./entities";
import {OrganizedBlock} from "starknet-parser/src/types/organizedStarknet";

export interface BlockProvider {
  get(blockNumber: number): Promise<GetBlockResponse>
}

export class OnlineBlockProvider implements BlockProvider {
  constructor(private readonly provider: Provider) {}

  async get(blockNumber: number) {
    const res = this.provider.getBlock(blockNumber) as any
    return res as GetBlockResponse
  }
}

export class MockBlockProvider implements BlockProvider {
  constructor(private readonly cache: { [blockNumber: number]: GetBlockResponse }) {}

  async get(blockNumber: number) {
    return this.cache[blockNumber]
  }
}

export class DatabaseAbiProvider implements AbiProvider {
  private readonly repository: Repository<RawAbi>
  private readonly cache: { [key: string]: Abi }

  constructor(private readonly provider: Provider, ds: DataSource) {
    this.cache = {}
    this.repository = ds.getRepository<RawAbi>(RawAbiEntity)
  }

  async get(contractAddress: string) {
    let ret

    const fromCache = this.cache[contractAddress]

    if(!ret) {
      const fromDb = await this.repository.findOneBy({contract_address: contractAddress})

      if(!fromDb) {
        const {abi: fromApi} = await this.provider.getCode(contractAddress)
        await this.repository.save({contract_address: contractAddress, raw: fromApi})
        ret = fromApi
        console.debug(`from api for ${contractAddress}`)
      } else {
        ret = fromDb.raw
        console.debug(`from db for ${contractAddress}`)
      }
    } else {
      ret = fromCache
      console.debug(`from cache for ${contractAddress}`)
    }

    return ret
  }
}

export class DatabaseBlockProvider implements BlockProvider {
  private readonly repository: Repository<RawBlock>
  private readonly cache: { [key: string]: GetBlockResponse }

  constructor(private readonly provider: Provider, ds: DataSource) {
    this.cache = {}
    this.repository = ds.getRepository<RawBlock>(RawBlockEntity)
  }

  async get(blockNumber: number) {
    let ret

    const fromCache = this.cache[blockNumber]

    if(!ret) {
      const fromDb = await this.repository.findOneBy({block_number: blockNumber})

      if(!fromDb) {
        const res = await this.provider.getBlock(blockNumber) as any
        const fromApi = res as GetBlockResponse
        await this.repository.save({block_number: blockNumber, raw: fromApi})
        ret = fromApi
        console.debug(`from api for ${blockNumber}`)
      } else {
        ret = fromDb.raw
        console.debug(`from db for ${blockNumber}`)
      }
    } else {
      ret = fromCache
      console.debug(`from cache for ${blockNumber}`)
    }

    return ret
  }
}