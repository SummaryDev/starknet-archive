import {AbiProvider} from "../interfaces";
import {DataSource, Repository} from "typeorm";
import {ArgumentEntity, InputEntity, RawAbi, RawAbiEntity, TransactionEntity} from "../../entities";
import {EventArgument, FunctionInput, OrganizedTransaction} from "../../types/organize-starknet";
import {MemoryCache} from "../../helpers/cache";
import {Abi} from "../../types/raw-starknet";
import * as console from "../../helpers/console";
import {FunctionAbi} from "starknet";
import {ApiProvider, ViewProvider} from "../interfaces";

export class DatabaseAbiProvider implements AbiProvider {
  private readonly repository: Repository<RawAbi>
  private readonly txRepository: Repository<OrganizedTransaction>
  private readonly inputRepository: Repository<FunctionInput>
  private readonly argumentRepository: Repository<EventArgument>

  private readonly memoryCache: MemoryCache

  constructor(private readonly contractApiProvider: ApiProvider, private readonly classApiProvider: ApiProvider, private readonly viewProvider: ViewProvider, ds: DataSource) {
    this.repository = ds.getRepository<RawAbi>(RawAbiEntity)
    this.txRepository = ds.getRepository<OrganizedTransaction>(TransactionEntity)
    this.inputRepository = ds.getRepository<FunctionInput>(InputEntity)
    this.argumentRepository = ds.getRepository<EventArgument>(ArgumentEntity)

    this.memoryCache = MemoryCache.getInstance()
  }

  async get(contractAddress: string, blockNumber: number, blockHash?: string): Promise<Abi | undefined> {
    let ret

    const contractAbi = await this.getAbi(contractAddress)

    if (!contractAbi || !Array.isArray(contractAbi) || contractAbi.length == 0) {
      console.warn(`getAbi returned no result for contract ${contractAddress}`)
      return
    }

    ret = contractAbi

    if (DatabaseAbiProvider.isProxy(contractAbi)) {
      const implementation = await this.findImplementation(contractAddress, contractAbi, blockNumber, blockHash)

      if (!implementation) {
        console.warn(`findImplementation returned no result for proxy contract ${contractAddress} at block ${blockNumber}`)
      } else {
        const implementationAbi = await this.getAbi(implementation)

        if (!implementationAbi || !Array.isArray(implementationAbi) || implementationAbi.length == 0) {
          console.warn(`getAbi returned no result for implementation ${implementation} of proxy contract ${contractAddress} at block ${blockNumber}`)
        } else {
          ret = implementationAbi

          const proxyConstructor = DatabaseAbiProvider.findConstructor(contractAbi as FunctionAbi[])
          const implementationConstructor = DatabaseAbiProvider.findConstructor(implementationAbi as FunctionAbi[])

          if (proxyConstructor && !implementationConstructor)
            ret.push(proxyConstructor)

          console.debug(`found abi for implementation ${implementation} of proxy ${contractAddress} at block ${blockNumber}`)
        }
      }
    }

    return ret
  }

  static findConstructor(a: FunctionAbi[]) {
    if (a && Array.isArray(a))
      return a.find(o => {
        return o.type === 'constructor'
      })
    else
      return undefined
  }

  async getAbi(h: string): Promise<Abi> {
    let ret

    const fromMemory = await this.memoryCache.get(h);
    if (fromMemory) {
      ret = fromMemory
    } else {
      const fromDb = await this.repository.findOneBy({contract_address: h})//TODO even tho we store contract and class abi in the same table the pk name contract_address is confusing: for classes it should class_hash perhaps a better generic name is `hash`

      if (fromDb && fromDb.raw) {
        ret = fromDb.raw
        console.debug(`from db for ${h}`)
      } else {
        let fromApi = await this.classApiProvider.getClassAbi(h)

        if (!fromApi)
          fromApi = await this.contractApiProvider.getContractAbi(h)


        if (fromApi) {
          await this.repository.save({contract_address: h, raw: fromApi})
          ret = fromApi
          console.debug(`from api for ${h}`)
        }

      }

      if (ret)
        await this.memoryCache.set(h, ret, true)
    }

    return ret
  }

  async findImplementation(proxyContractAddress: string, proxyContractAbi: Abi | undefined, blockNumber: number, blockHash?: string): Promise<string | undefined> {
    let ret = undefined

    if (!proxyContractAbi)
      return ret

    const implementationContractGetters = DatabaseAbiProvider.getImplementationGetters(proxyContractAbi)
    const implementationConstructors = DatabaseAbiProvider.getImplementationConstructors(proxyContractAbi)
    const upgradeEvents = DatabaseAbiProvider.getUpgradeEvents(proxyContractAbi)

    if (implementationContractGetters.length == 1) {
      ret = await this.findImplementationByGetter(proxyContractAddress, proxyContractAbi, blockNumber, blockHash)
    }

    if (!ret && upgradeEvents.length == 1) {
      ret = await this.findImplementationByEvent(proxyContractAddress, proxyContractAbi, blockNumber)
    }

    if (!ret && implementationConstructors.length == 1) {
      ret = await this.findImplementationByConstructor(proxyContractAddress, proxyContractAbi, blockNumber)
    }

    return ret
  }

  async findImplementationByConstructor(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
    let ret = undefined

    const constructors = DatabaseAbiProvider.getImplementationConstructors(proxyContractAbi)

    if (constructors.length != 1) {
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

      if (!input) {
        console.warn(`cannot getImplementation from empty query looking for input like ${inputName} of the deployment transaction for proxy contract ${proxyContractAddress} before block ${blockNumber}`)
      } else {
        ret = input.value
      }
    }

    return ret
  }

  async findImplementationByEvent(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
    let ret = undefined

    const upgradeEvents = DatabaseAbiProvider.getUpgradeEvents(proxyContractAbi)

    if (upgradeEvents.length != 1) {
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

      if (!arg) {
        console.warn(`cannot getImplementation from empty query looking for argument ${argName} in event ${upgradeEventName} for proxy contract ${proxyContractAddress} before block ${blockNumber}`)
      } else {
        ret = arg.value
      }
    }

    return ret
  }

  async findImplementationByGetter(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number, blockHash?: string): Promise<string | undefined> {
    let ret = undefined

    const viewFunctions = DatabaseAbiProvider.getImplementationGetters(proxyContractAbi)

    if (viewFunctions.length != 1) {
      console.warn(`cannot findImplementationByGetter from ${viewFunctions.length} viewFunctions in abi for proxy contract ${proxyContractAddress}`)
    } else {
      const viewFnAbi = viewFunctions[0]
      const viewFn = viewFnAbi.name

      const implementations = await this.viewProvider.get(proxyContractAddress, viewFn, blockNumber, blockHash)

      if (implementations.length != 1) {
        console.warn(`cannot findImplementationByGetter from ${implementations.length} implementations in results from ${viewFn} for proxy contract ${proxyContractAddress} at block ${blockNumber}`)
      } else {
        ret = implementations[0]
      }
    }

    return ret
  }

  static getUpgradeEvents(abi: Abi) {
    const filterstrings = ['upgrade']
    const regex = new RegExp(filterstrings.join('|'), 'i')

    const upgradeEvents = abi.filter(o => {
      return o.type == 'event' && regex.test(o.name)
    })

    console.debug(upgradeEvents)

    return upgradeEvents
  }

  static getImplementationConstructors(abi: Abi) {
    const filterstrings = ['implement']
    const regex = new RegExp(filterstrings.join('|'), 'i')

    const implementationConstructors = abi.filter(o => {
      const a = o as FunctionAbi
      if (!a.inputs)
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
    const filterstrings = ['get_implementation', 'implementation', 'proxy_get_implementation', 'Proxy_get_implementation', 'getImplementation', 'getImplementation_', 'get_implementation_class_hash', 'getImplementationHash']

    const implementationContractGetters = abi.filter(o => {
      const a = o as FunctionAbi
      return a.type == 'function' && filterstrings.includes(a.name) && a.stateMutability == 'view'
    })

    console.debug(implementationContractGetters)

    return implementationContractGetters
  }

  static isProxy(abi: Abi | undefined) {
    if (!abi)
      return false

    const implementationGetters = DatabaseAbiProvider.getImplementationGetters(abi)
    const implementationConstructors = DatabaseAbiProvider.getImplementationConstructors(abi)
    const upgradeEvents = DatabaseAbiProvider.getUpgradeEvents(abi)

    return implementationGetters.length == 1 || implementationConstructors.length == 1 || upgradeEvents.length == 1
  }

}
