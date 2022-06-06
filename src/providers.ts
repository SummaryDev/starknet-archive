import {GetBlockResponse, GetCodeResponse, Abi} from "starknet-parser/src/types/rawStarknet"
import {AbiProvider} from "starknet-parser/lib/organizers/AbiProvider"
import {FunctionAbi, Provider} from "starknet"
import * as console from 'starknet-parser/lib/helpers/console'
import {Cache} from 'starknet-parser/lib/helpers/helpers'
import {DataSource, ILike, LessThanOrEqual, Like, Repository} from "typeorm"
import {RawView, RawViewEntity, RawAbi, RawAbiEntity, RawBlock, RawBlockEntity, InputEntity, ArgumentEntity, TransactionEntity} from "./entities"
import {OrganizedEvent,OrganizedTransaction,EventArgument,FunctionInput} from "starknet-parser/src/types/organizedStarknet"

export class DatabaseAbiProvider implements AbiProvider {
  private readonly abiCache: Cache<Abi>
  private readonly viewProvider: ViewProvider
  private readonly repository: Repository<RawAbi>
  private readonly txRepository: Repository<OrganizedTransaction>
  private readonly inputRepository: Repository<FunctionInput>
  private readonly argumentRepository: Repository<EventArgument>

  constructor(private readonly provider: Provider, viewProvider: ViewProvider, ds: DataSource) {
    this.abiCache = new Cache<Abi>()
    this.viewProvider = viewProvider
    this.repository = ds.getRepository<RawAbi>(RawAbiEntity)
    this.txRepository = ds.getRepository<OrganizedTransaction>(TransactionEntity)
    this.inputRepository = ds.getRepository<FunctionInput>(InputEntity)
    this.argumentRepository = ds.getRepository<EventArgument>(ArgumentEntity)
  }

  async get(contractAddress: string, blockNumber: number): Promise<Abi | undefined> {
    let ret

    const fromCache = this.abiCache.get(blockNumber, contractAddress)

    if(!fromCache) {
      const fromDbOrApi = await this.getBare(contractAddress, blockNumber)

      if(!fromDbOrApi) {
        console.warn(`getFromDbOrApi returned no result for contract ${contractAddress} block ${blockNumber}`)
      } else {
        ret = fromDbOrApi

        if(DatabaseAbiProvider.isProxy(fromDbOrApi)) {
          const implementationContractAddress = await this.findImplementationContractAddress(contractAddress, fromDbOrApi, blockNumber)

          if(!implementationContractAddress) {
            console.warn(`findImplementationContractAddress returned no result for proxy contract ${contractAddress} block ${blockNumber}`)
          } else {
            const implementationFromDbOrApi = await this.getBare(implementationContractAddress, blockNumber)

            if(!implementationFromDbOrApi) {
              console.warn(`getFromDbOrApi returned no result for implementation contract ${implementationContractAddress} block ${blockNumber}`)
            } else {
              ret = implementationFromDbOrApi

              console.debug(`found implementation abi for contract ${implementationContractAddress} of proxy ${contractAddress} at ${blockNumber}`)
            }
          }
        }

        this.abiCache.set(ret, blockNumber, contractAddress)
      }

    } else {
      ret = fromCache
      console.debug(`from cache for ${contractAddress} at ${blockNumber}`)
    }

    return ret
  }

  async getBare(contractAddress: string, blockNumber: number): Promise<Abi> {
    let ret

    //TODO use find() and cache query?
    const fromDb = await this.repository.findOneBy({contract_address: contractAddress, block_number: blockNumber})

    if(!fromDb) {
      const getCodeResponse = await this.provider.getCode(contractAddress, blockNumber) as any
      const code = getCodeResponse as GetCodeResponse
      const fromApi = code.abi

      await this.repository.save({contract_address: contractAddress, block_number: blockNumber, raw: fromApi})
      ret = fromApi
      console.debug(`from api for ${contractAddress} at ${blockNumber}`)
    } else {
      ret = fromDb.raw
      console.debug(`from db for ${contractAddress} at ${blockNumber}`)
    }

    return ret
  }

  async findImplementationContractAddress(proxyContractAddress: string, proxyContractAbi: Abi | undefined, blockNumber: number): Promise<string | undefined> {
    let ret = undefined

    if(!proxyContractAbi)
      return ret

    //TODO revisit logic which result is more reliable byEvent || byGetter || byConstructor

    if(DatabaseAbiProvider.getImplementationGetters(proxyContractAbi).length == 1) {
      ret = await this.findImplementationContractAddressByGetter(proxyContractAddress, proxyContractAbi, blockNumber)
    } else if (DatabaseAbiProvider.getUpgradeEvents(proxyContractAbi).length == 1) {
      ret = await this.findImplementationContractAddressByEvent(proxyContractAddress, proxyContractAbi, blockNumber)
    } else if (DatabaseAbiProvider.getImplementationConstructors(proxyContractAbi).length == 1) {
      ret = await this.findImplementationContractAddressByConstructor(proxyContractAddress, proxyContractAbi, blockNumber)
    } else {
      console.warn(`cannot findImplementationContractAddress no hints found neither by getter nor by upgrade event nor by constructor for proxy contract ${proxyContractAddress} block ${blockNumber}`)
    }

    return ret
  }

  async findImplementationContractAddressByAll(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
    const byGetter = await this.findImplementationContractAddressByGetter(proxyContractAddress, proxyContractAbi, blockNumber)
    const byEvent = await this.findImplementationContractAddressByEvent(proxyContractAddress, proxyContractAbi, blockNumber)
    const byConstructor = await this.findImplementationContractAddressByConstructor(proxyContractAddress, proxyContractAbi, blockNumber)

    if(byGetter && byEvent && byGetter !== byEvent) {
      console.warn(`findImplementationContractAddress results differ byGetter ${byGetter} and byEvent ${byEvent}`)
    }

    if(byGetter && byConstructor && byGetter !== byConstructor) {
      console.warn(`findImplementationContractAddress results differ byGetter ${byGetter} and byConstructor ${byConstructor}`)
    }

    if(byEvent && byConstructor && byEvent !== byConstructor) {
      console.warn(`findImplementationContractAddress results differ byEvent ${byEvent} and byConstructor ${byConstructor}`)
    }

    //TODO revisit logic which result is more reliable byEvent || byGetter || byConstructor

    return byEvent || byGetter || byConstructor
  }

  async findImplementationContractAddressByConstructor(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
    let ret = undefined

    const constructors = DatabaseAbiProvider.getImplementationConstructors(proxyContractAbi)

    if(constructors.length != 1) {
      console.warn(`cannot getImplementation from ${constructors.length} constructors in abi for proxy contract ${proxyContractAddress} before block ${blockNumber}`)
    } else {
      //TODO not using constructor input name that we know from the abi instead searching for '%implement%' -- fork in logic?
      // const constructorAbi = constructors[0]
      // const constructorName = constructorAbi.name
      const inputName = '%implement%'

      const input = await this.inputRepository.createQueryBuilder('i')
        .leftJoin('i.transaction', 't')
        .leftJoin('t.block', 'b')
        .where('b.block_number <= :blockNumber', {blockNumber: blockNumber})
        .andWhere('t.contract_address = :proxyContractAddress', {proxyContractAddress: proxyContractAddress})
        .andWhere('t.type = :txType', {txType: 'DEPLOY'})
        .andWhere('i.name ilike :inputName', {inputName: inputName})
        .andWhere('i.type = :type', {type: 'felt'})
        .orderBy('b.block_number', 'DESC')
        .limit(1)
        .getOne()

      console.debug(input)

      if(!input) {
        console.warn(`cannot getImplementation from empty query looking for input like ${inputName} of the deployment transaction for proxy contract ${proxyContractAddress} before block ${blockNumber}`)
      } else {
        ret = input.value
      }

      // const tx = await this.txRepository.createQueryBuilder('t')
      //   .leftJoin('t.block', 'b')
      //   .where('b.block_number <= :blockNumber', {blockNumber: blockNumber})
      //   .andWhere('t.contract_address = :proxyContractAddress', {proxyContractAddress: proxyContractAddress})
      //   .andWhere('t.type = :txType', {txType: 'DEPLOY'})
      //   .orderBy('b.block_number', 'DESC')
      //   .limit(1)
      //   .getOne()
      //
      // console.debug(tx)

      // if(!tx) {
      //   console.warn(`cannot getImplementation from empty query looking for deployment transaction for proxy contract ${proxyContractAddress} before block ${blockNumber}`)
      // } else {
      //   const calldata = tx.constructor_calldata
      //
      //   if(calldata.length != 1) {
      //     console.warn(`cannot getImplementation from ${calldata.length} length calldata for deployment transaction ${tx.transaction_hash} for proxy contract ${proxyContractAddress} before block ${blockNumber}`)
      //   } else {
      //     //TODO should parse constructor calldata into function inputs and look for '%implementation%' input, don't rely on just a single input
      //     /*
      //     {
      //       "name": "constructor",
      //       "type": "constructor",
      //       "inputs": [
      //         {
      //           "name": "implementation_address",
      //           "type": "felt"
      //         }
      //       ],
      //       "outputs": []
      //     }
      //      */
      //     ret = calldata[0]
      //   }
      // }
    }

    return ret
  }

  async findImplementationContractAddressByEvent(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
    let ret = undefined

    const upgradeEvents = DatabaseAbiProvider.getUpgradeEvents(proxyContractAbi)

    if(upgradeEvents.length != 1) {
      console.warn(`cannot getImplementation from ${upgradeEvents.length} upgradeEvents in abi for proxy contract ${proxyContractAddress} before block ${blockNumber}`)
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
        console.warn(`cannot getImplementation from empty query looking for argument ${argName} in event ${upgradeEventName} for proxy contract ${proxyContractAddress} before block ${blockNumber}`)
      } else {
        ret = arg.value
      }
    }

    return ret
  }

  async findImplementationContractAddressByGetter(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
    let ret = undefined

    const viewFunctions = DatabaseAbiProvider.getImplementationGetters(proxyContractAbi)

    if(viewFunctions.length != 1) {
      console.warn(`cannot findImplementationContractAddressByGetter from ${viewFunctions.length} viewFunctions in abi for proxy contract ${proxyContractAddress}`)
    } else {
      const viewFnAbi = viewFunctions[0]
      const viewFn = viewFnAbi.name

      try {
        const implementations = await this.viewProvider.get(proxyContractAddress, viewFn, blockNumber)

        if(implementations.length != 1) {
          console.warn(`cannot findImplementationContractAddressByGetter from ${implementations.length} implementations in results from ${viewFn} for proxy contract ${proxyContractAddress} at block ${blockNumber}`)
        } else {
          ret = implementations[0]
        }
      } catch(err) {
        console.warn(`cannot findImplementationContractAddressByGetter from api call to ${viewFn} for proxy contract ${proxyContractAddress} at block ${blockNumber}`)
      }
    }

    return ret
  }

  static getUpgradeEvents(abi: Abi) {
    const filterstrings = ['upgrade']
    const regex = new RegExp( filterstrings.join( '|' ), 'i')

    const upgradeEvents = abi.filter(o => {
      return o.type == 'event' && regex.test(o.name)
    })

    console.debug(upgradeEvents)

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

    console.debug(implementationConstructors)

    return implementationConstructors
  }

  static getImplementationGetters(abi: Abi) {
    const filterstrings = ['implement']
    const regex = new RegExp( filterstrings.join( '|' ), 'i')

    const implementationGetters = abi.filter(o => {
      const a = o as FunctionAbi
      // if(!a.outputs)
      //   return false
      // const implementOutputs = a.outputs.filter(i => {
      //   return regex.test(i.name)
      // })
      return a.type == 'function' && regex.test(a.name) && a.stateMutability == 'view' /*&& implementOutputs.length > 0*/
    })

    console.debug(implementationGetters)

    return implementationGetters
  }

  static isProxy(abi: Abi | undefined) {
    return abi && (DatabaseAbiProvider.getImplementationGetters(abi).length == 1 || DatabaseAbiProvider.getImplementationConstructors(abi).length == 1 || DatabaseAbiProvider.getUpgradeEvents(abi).length == 1)
  }

}

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

export interface ViewProvider {
  get(contractAddress: string, viewFunction: string, blockNumber: number): Promise<string[]>
}

export class OnlineViewProvider implements ViewProvider {
  constructor(private readonly provider: Provider) {}

  async get(contractAddress: string, viewFunction: string, blockNumber: number) {
    const rawRes = await this.provider.callContract({contractAddress: contractAddress, entrypoint: viewFunction}, {blockIdentifier: blockNumber})
    return rawRes.result
  }
}
export class DatabaseViewProvider implements ViewProvider {
  private readonly repository: Repository<RawView>

  constructor(private readonly provider: Provider, ds: DataSource) {
    this.repository = ds.getRepository<RawView>(RawViewEntity)
  }

  async get(contractAddress: string, viewFunction: string, blockNumber: number) {
    let ret

    const fromDb = await this.repository.findOneBy({block_number: blockNumber, contract_address: contractAddress, view_function: viewFunction})

    if(!fromDb) {
      const rawRes = await this.provider.callContract({contractAddress: contractAddress, entrypoint: viewFunction}, {blockIdentifier: blockNumber})
      const fromApi = rawRes.result
      await this.repository.save({block_number: blockNumber, contract_address: contractAddress, view_function: viewFunction, raw: fromApi})
      ret = fromApi
      console.debug(`from api for ${contractAddress} ${viewFunction} ${blockNumber}`)
    } else {
      ret = fromDb.raw
      console.debug(`from db for ${contractAddress} ${viewFunction} ${blockNumber}`)
    }

    return ret
  }
}
