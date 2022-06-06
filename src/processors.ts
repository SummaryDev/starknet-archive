import {DataSource, Repository} from "typeorm";
import {defaultProvider, Provider} from "starknet";
import {BlockEntity, RawAbi, RawAbiEntity, RawBlock, RawBlockEntity, TransactionEntity} from "./entities";
import {OrganizedBlock, OrganizedTransaction} from "starknet-parser/src/types/organizedStarknet";
import {BlockProvider, DatabaseAbiProvider, DatabaseBlockProvider, DatabaseViewProvider} from "./providers";
import axios from "axios";
import * as console from "starknet-parser/lib/helpers/console";
import {BlockOrganizer} from "starknet-parser/lib/organizers/BlockOrganizer";
import {GetBlockResponse, GetCodeResponse} from "starknet-parser/src/types/rawStarknet";

export interface BlockProcessor {
  process(blockNumber: number): Promise<boolean>
}

export class OrganizeBlockProcessor implements BlockProcessor {
  private readonly blockRepository: Repository<OrganizedBlock>
  private readonly blockProvider: BlockProvider
  private readonly blockOrganizer: BlockOrganizer

  constructor(private readonly provider: Provider, private readonly ds: DataSource) {
    this.blockRepository = ds.getRepository<OrganizedBlock>(BlockEntity)
    this.blockProvider = new DatabaseBlockProvider(defaultProvider, ds) //OnlineBlockProvider(defaultProvider)
    const viewProvider = new DatabaseViewProvider(defaultProvider, ds)
    const abiProvider = new DatabaseAbiProvider(defaultProvider, viewProvider, ds) //OnlineAbiProvider(defaultProvider)
    this.blockOrganizer = new BlockOrganizer(abiProvider)
  }

  async process(blockNumber: number): Promise<boolean> {
    let organizedBlock: OrganizedBlock

    try {
      const block = await this.blockProvider.get(blockNumber)
      organizedBlock = await this.blockOrganizer.organizeBlock(block)
      await this.blockRepository.save(organizedBlock)
      console.info(`saved organized ${blockNumber}`)
    } catch(err) {
      if(axios.isAxiosError(err)) {
        console.info(`retrying ${blockNumber} for ${err}`/*, err*/)
        return false
      }
      console.error(`cannot get or organize or save ${blockNumber}, rethrowing ${err}`/*, err*/)
      throw err
    }

    return true
  }
}

export class ArchiveBlockProcessor implements BlockProcessor {
  private readonly repository: Repository<RawBlock>

  constructor(private readonly provider: Provider, ds: DataSource) {
    this.repository = ds.getRepository<RawBlock>(RawBlockEntity)
  }

  async process(blockNumber: number): Promise<boolean> {

    try {
      const res = await this.provider.getBlock(blockNumber) as any
      const fromApi = res as GetBlockResponse
      await this.repository.save({block_number: blockNumber, raw: fromApi})
      console.info(`saved raw ${blockNumber}`)
    } catch(err) {
      if(axios.isAxiosError(err)) {
        console.info(`retrying ${blockNumber} for ${err}`/*, err*/)
        return false
      }
      console.error(`cannot get or save raw ${blockNumber}, rethrowing ${err}`/*, err*/)
      throw err
    }

    return true
  }
}

export class ArchiveAbiProcessor implements BlockProcessor {
  private readonly repository: Repository<RawAbi>
  private readonly txRepository: Repository<OrganizedTransaction>

  constructor(private readonly provider: Provider, ds: DataSource) {
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
        const getCodeResponse = await this.provider.getCode(contractAddress, blockNumber) as any
        const code = getCodeResponse as GetCodeResponse
        const fromApi = code.abi

        await this.repository.save({contract_address: contractAddress, block_number: blockNumber, raw: fromApi})
        console.info(`saved abi from api for ${contractAddress} at ${blockNumber}`)
      }
    } catch(err) {
      if(axios.isAxiosError(err)) {
        console.info(`retrying ${blockNumber} for ${err}`/*, err*/)
        return false
      }
      console.error(`cannot get or save raw abi for ${contractAddresses.length} distinct contractAddresses in block ${blockNumber}, rethrowing ${err}`/*, err*/)
      throw err
    }

    return true
  }
}