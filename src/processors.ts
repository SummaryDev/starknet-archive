import {DataSource, Repository} from "typeorm";
import {BlockEntity, RawAbi, RawAbiEntity, RawBlock, RawBlockEntity, TransactionEntity} from "./entities";
import {OrganizedBlock, OrganizedTransaction} from "./types/organized-starknet";
import { Api } from './api/interfaces';
import { DatabaseApi } from './api/database';
import { ApiError } from './helpers/error';
import * as console from "./helpers/console";
import { BlockOrganizer } from "./organizers/block";

export interface BlockProcessor {
  process(blockNumber: number): Promise<boolean>
}

function canRetry(err: any): boolean {
  const ret = err instanceof ApiError // communication failures
    || (err instanceof Error && err.message !== undefined && err.message !== null && (err.message.includes('ECONNRESET') || err.message.includes('EAI_AGAIN') || err.message.includes('StarkErrorCode.MALFORMED_REQUEST') //TODO these must be coming from starknet.js and thus are not ApiError
      || err.message.includes('BLOCK_NOT_FOUND') // feeder api: block is not there yet
        || err.message.includes('Invalid block')) // pathfinder api code 24: block is not there yet //TODO when start sourcing everything from pathfinder such gap where we got the block already but cannot call other api methods at this block should not be possible and should be treated as unrecoverable error
    )
  if(ret)
    console.info(`retrying for ${err}`/*, err*/)
  else
    console.info(`cannot retry for ${err}`/*, err*/)
  return ret
}

export class OrganizeBlockProcessor implements BlockProcessor {
  private readonly blockRepository: Repository<OrganizedBlock>
  private readonly blockOrganizer: BlockOrganizer
  private readonly databaseApi: DatabaseApi

  constructor(api: Api, ds: DataSource) {
    this.blockRepository = ds.getRepository<OrganizedBlock>(BlockEntity)
    this.databaseApi = new DatabaseApi(api, ds)
    this.blockOrganizer = new BlockOrganizer(this.databaseApi)
  }

  async process(blockNumber: number): Promise<boolean> {
    let organizedBlock: OrganizedBlock

    try {
      const block = await this.databaseApi.getBlock(blockNumber)
      if(!block)
        return false

      organizedBlock = await this.blockOrganizer.organizeBlock(block)
      await this.blockRepository.save(organizedBlock)
      console.info(`saved organized ${blockNumber}`)

    } catch(err) {
      if (canRetry(err))
        return false

      console.error(`cannot get or organize or save ${blockNumber}, rethrowing ${err}`/*, err*/)
      throw err
    }

    return true
  }
}

export class ArchiveBlockProcessor implements BlockProcessor {
  private readonly repository: Repository<RawBlock>

  constructor(private readonly api: Api, ds: DataSource) {
    this.repository = ds.getRepository<RawBlock>(RawBlockEntity)
  }

  async process(blockNumber: number): Promise<boolean> {

    try {
      const fromApi = await this.api.getBlock(blockNumber)
      await this.repository.save({block_number: blockNumber, raw: fromApi})
      console.info(`saved raw ${blockNumber}`)
    } catch(err) {
      if (canRetry(err))
        return false
      console.error(`cannot get or save raw ${blockNumber}, rethrowing ${err}`/*, err*/)
      throw err
    }

    return true
  }
}

export class ArchiveAbiProcessor implements BlockProcessor {
  private readonly repository: Repository<RawAbi>
  private readonly txRepository: Repository<OrganizedTransaction>

  constructor(private readonly api: Api, ds: DataSource) {
    this.repository = ds.getRepository<RawAbi>(RawAbiEntity)
    this.txRepository = ds.getRepository<OrganizedTransaction>(TransactionEntity)
  }

  async getContractAddresses(blockNumber: number): Promise<string[]> {
    const contractAddresses = await this.txRepository.createQueryBuilder('t')
      .leftJoin('t.block', 'b')
      .where('b.block_number = :blockNumber', {blockNumber: blockNumber})
      .andWhere('t.type = :txType', {txType: 'INVOKE_FUNCTION'})
      .select('t.contract_address')
      .distinct(true)
      .getRawMany()
    console.info(`${contractAddresses.length} distinct contractAddresses in invoke transactions in block ${blockNumber}`)
    const ret = contractAddresses.map(o => {
      return o.t_contract_address
    })
    return ret
  }

  async process(blockNumber: number): Promise<boolean> {
    let contractAddresses = []

    try {
      contractAddresses = await this.getContractAddresses(blockNumber)

      for(let i=0; i < contractAddresses.length; i++) {
        const contractAddress = contractAddresses[i]
        const fromApi = await this.api.getContractAbi(contractAddress)

        await this.repository.save({contract_address: contractAddress, raw: fromApi})
        console.info(`saved abi from api for ${contractAddress} at ${blockNumber}`)
      }
    } catch(err) {
      if (canRetry(err))
        return false
      console.error(`cannot get or save raw abi for ${contractAddresses.length} distinct contractAddresses in block ${blockNumber}, rethrowing ${err}`/*, err*/)
      throw err
    }

    return true
  }
}