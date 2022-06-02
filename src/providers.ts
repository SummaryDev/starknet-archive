import {GetBlockResponse, GetCodeResponse, Abi} from "starknet-parser/src/types/rawStarknet"
import {AbiProvider} from "starknet-parser/lib/organizers/AbiProvider"
import {FunctionAbi, Provider} from "starknet"
import * as console from 'starknet-parser/lib/helpers/console'
import {DataSource, ILike, LessThanOrEqual, Like, Repository} from "typeorm";
import {RawAbi, RawAbiEntity, RawBlock, RawBlockEntity, TransactionEntity, EventEntity, ArgumentEntity} from "./entities";
import {OrganizedEvent, OrganizedTransaction, EventArgument} from "starknet-parser/src/types/organizedStarknet";

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
  private readonly cache: { [key: string]: Abi }
  private readonly repository: Repository<RawAbi>
  private readonly txRepository: Repository<OrganizedTransaction>
  private readonly eventRepository: Repository<OrganizedEvent>
  private readonly argumentRepository: Repository<EventArgument>

  constructor(private readonly provider: Provider, ds: DataSource) {
    this.cache = {}
    this.repository = ds.getRepository<RawAbi>(RawAbiEntity)
    this.txRepository = ds.getRepository<OrganizedTransaction>(TransactionEntity)
    this.eventRepository = ds.getRepository<OrganizedEvent>(EventEntity)
    this.argumentRepository = ds.getRepository<EventArgument>(ArgumentEntity)
  }

  async get(contractAddress: string): Promise<Abi> {
    let ret

    const fromCache = this.cache[contractAddress]

    if(!fromCache) {
      const fromDb = await this.repository.findOneBy({contract_address: contractAddress})

      if(!fromDb) {
        const getCodeResponse = await this.provider.getCode(contractAddress) as any
        const code = getCodeResponse as GetCodeResponse
        const fromApi = code.abi

        await this.repository.save({contract_address: contractAddress, raw: fromApi})
        ret = fromApi
        console.debug(`from api for ${contractAddress}`)
      } else {
        ret = fromDb.raw
        console.debug(`from db for ${contractAddress}`)
      }

      this.cache[contractAddress] = ret

    } else {
      ret = fromCache
      console.debug(`from cache for ${contractAddress}`)
    }

    return ret
  }

  async findImplementationContractAddressByContructor(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber?: number): Promise<string | undefined> {
    let ret = undefined

    // const txDeploy = await this.txRepository.findBy({type: 'DEPLOY'})
    // if(txDeploy.length != 1) {
    //   console.warn(`cannot getImplementation from ${txDeploy.length} deployment transactions for ${proxyContractAddress}`)
    // }
    //
    // txDeploy[0].inputs

    return ret
  }

  async findImplementationContractAddressByEvent(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
    let ret = undefined

    const upgradeEvents = DatabaseAbiProvider.getUpgradeEvents(proxyContractAbi)

    if(upgradeEvents.length != 1) {
      console.warn(`cannot getImplementation from ${upgradeEvents.length} upgradeEvents in abi for ${proxyContractAddress} before block ${blockNumber}`)
    } else {
      const upgradeEventAbi = upgradeEvents[0]
      const upgradeEventName = upgradeEventAbi.name
      const argName = '%implement%'

      const arg = await this.argumentRepository.createQueryBuilder('a')
        .leftJoin('a.event', 'e')
        .leftJoin('e.transaction', 't')
        .leftJoin('t.block', 'b')
        .where('b.block_number <= :blockNumber', {blockNumber: blockNumber})
        .andWhere('e.transmitter_contract = :proxyContractAddress', {proxyContractAddress: proxyContractAddress})
        .andWhere('e.name = :eventName', {eventName: upgradeEventName})
        .andWhere('a.name ilike :argName', {argName: argName})
        .andWhere('a.type = :type', {type: 'felt'})
        .orderBy('b.block_number', 'DESC')
        .limit(1)
        .getOne()

      console.debug(arg)

      if(!arg) {
        console.warn(`cannot getImplementation from empty query looking for argument ${argName} in event ${upgradeEventName} for ${proxyContractAddress} before block ${blockNumber}`)
      } else {
        ret = arg.value
      }
    }

    return ret
  }

  async findImplementationContractAddressByGetter(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber?: number): Promise<string | undefined> {
    let ret = undefined

    const viewFunctions = DatabaseAbiProvider.getImplementationGetters(proxyContractAbi)

    if(viewFunctions.length != 1) {
      console.warn(`cannot getImplementation from ${viewFunctions.length} viewFunctions in abi for ${proxyContractAddress}`)
    } else {
      const viewFnAbi = viewFunctions[0]
      const viewFn = viewFnAbi.name

      const implementations = await this.callViewFn(proxyContractAddress, viewFn)
      if(implementations.length != 1) {
        console.warn(`cannot getImplementation from ${implementations.length} implementations in results from ${viewFn} for ${proxyContractAddress}`)
      } else {
        ret = implementations[0]
      }
    }

    return ret
  }

  async callViewFn(contractAddress: string, entrypoint: string) {
    const { result: rawRes } = await this.provider.callContract({
      contractAddress: contractAddress,
      entrypoint
    })

    console.debug(rawRes)

    return rawRes;
  }

  static getUpgradeEvents(abi: Abi) {
    const filterstrings = ['upgrade']
    const regex = new RegExp( filterstrings.join( '|' ), 'i')

    const upgradeEvents = abi.filter(o => {
      return o.type == 'event' && regex.test(o.name)
    })

    // console.debug(upgradeEvents)

    return upgradeEvents
  }

  static getImplementationConstructors(abi: Abi) {
    const filterstrings = ['implement']
    const regex = new RegExp( filterstrings.join( '|' ), 'i')

    const implementationConstructors = abi.filter(o => {
      const a = o as FunctionAbi
      if(!a.inputs)
        return false
      const implementInputs = a.inputs.filter(i => {
        return regex.test(i.name)
      })
      return a.type == 'constructor' && implementInputs.length > 0
    })

    // console.debug(implementationConstructors)

    return implementationConstructors
  }

  static getImplementationGetters(abi: Abi) {
    const filterstrings = ['implement']
    const regex = new RegExp( filterstrings.join( '|' ), 'i')

    const implementationGetters = abi.filter(o => {
      const a = o as FunctionAbi
      if(!a.outputs)
        return false
      const implementOutputs = a.outputs.filter(i => {
        return regex.test(i.name)
      })
      return a.type == 'function' && a.name.includes('implement') && a.stateMutability == 'view' && implementOutputs.length > 0
    })

    // console.debug(implementationGetters)

    return implementationGetters
  }

  static isProxy(abi: Abi) {
    return DatabaseAbiProvider.getImplementationGetters(abi).length > 0 || DatabaseAbiProvider.getImplementationConstructors(abi).length > 0 || DatabaseAbiProvider.getUpgradeEvents(abi).length > 0
  }

}

export class DatabaseBlockProvider implements BlockProvider {
  private readonly repository: Repository<RawBlock>

  constructor(private readonly provider: Provider, ds: DataSource) {
    this.repository = ds.getRepository<RawBlock>(RawBlockEntity)
  }

  async get(blockNumber: number) {
    let ret

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

    return ret
  }
}
