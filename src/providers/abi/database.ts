import { AbiProvider } from "starknet-parser/lib/organizers/AbiProvider";
import { DataSource, Repository } from "typeorm";
import { ArgumentEntity, InputEntity, RawAbi, RawAbiEntity, TransactionEntity } from "../../entities";
import { EventArgument, FunctionInput, OrganizedTransaction } from "starknet-parser/src/types/organizedStarknet";
import { MemoryCache } from "../../helpers/cache";
import { Abi } from "starknet-parser/src/types/rawStarknet";
import * as console from "starknet-parser/lib/helpers/console";
import { FunctionAbi } from "starknet";
import { ApiProvider, ViewProvider } from "../interfaces";

export class DatabaseAbiProvider implements AbiProvider {
    private readonly repository: Repository<RawAbi>
    private readonly txRepository: Repository<OrganizedTransaction>
    private readonly inputRepository: Repository<FunctionInput>
    private readonly argumentRepository: Repository<EventArgument>

    private readonly memoryCache: MemoryCache

    constructor(private readonly apiProvider: ApiProvider, private readonly viewProvider: ViewProvider, ds: DataSource) {
        this.repository = ds.getRepository<RawAbi>(RawAbiEntity)
        this.txRepository = ds.getRepository<OrganizedTransaction>(TransactionEntity)
        this.inputRepository = ds.getRepository<FunctionInput>(InputEntity)
        this.argumentRepository = ds.getRepository<EventArgument>(ArgumentEntity)

        this.memoryCache = MemoryCache.getInstance()
    }

    async get(contractAddress: string, blockNumber: number, blockHash?: string): Promise<Abi | undefined> {
        let ret

        const fromDbOrApi = await this.getBare(contractAddress)

        if (!fromDbOrApi || !Array.isArray(fromDbOrApi) || fromDbOrApi.length == 0) {
            console.warn(`getBare returned no result for contract ${contractAddress}`)
            return
        }

        ret = fromDbOrApi

        if (DatabaseAbiProvider.isProxy(fromDbOrApi)) {
            const implementationContractAddress = await this.findImplementationContractAddress(contractAddress, fromDbOrApi, blockNumber, blockHash)

            if (!implementationContractAddress) {
                console.warn(`findImplementationContractAddress returned no result for proxy contract ${contractAddress} at block ${blockNumber}`)
            } else {
                const implementationFromDbOrApi = await this.getBare(implementationContractAddress)

                if (!implementationFromDbOrApi || !Array.isArray(implementationFromDbOrApi) || implementationFromDbOrApi.length == 0) {
                    console.warn(`getBare returned no result for implementation contract ${implementationContractAddress} at block ${blockNumber}`)
                } else {
                    ret = implementationFromDbOrApi

                    const proxyConstructor = DatabaseAbiProvider.findConstructor(fromDbOrApi as FunctionAbi[])
                    const implementationConstructor = DatabaseAbiProvider.findConstructor(implementationFromDbOrApi as FunctionAbi[])

                    if (proxyConstructor && !implementationConstructor)
                        ret.push(proxyConstructor)

                    console.debug(`found implementation abi for contract ${implementationContractAddress} of proxy ${contractAddress} at block ${blockNumber}`)
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

    async getBare(contractAddress: string): Promise<Abi> {
        let ret

        const fromMemory = await this.memoryCache.get(contractAddress);
        if (fromMemory) {
            return fromMemory as Abi
        }
        const fromDb = await this.repository.findOneBy({contract_address: contractAddress})
        if (!fromDb) {
            const fromApi = await this.apiProvider.getAbi(contractAddress)

            await this.repository.save({contract_address: contractAddress, raw: fromApi})
            ret = fromApi
            console.debug(`from api for ${contractAddress}`)
        } else {
            ret = fromDb.raw
            console.debug(`from db for ${contractAddress}`)
        }

        await this.memoryCache.set(contractAddress, ret, true)
        return ret
    }

    async findImplementationContractAddress(proxyContractAddress: string, proxyContractAbi: Abi | undefined, blockNumber: number, blockHash?: string): Promise<string | undefined> {
        let ret = undefined

        if (!proxyContractAbi)
            return ret

        if (DatabaseAbiProvider.getImplementationGetters(proxyContractAbi).length == 1) {
            ret = await this.findImplementationContractAddressByGetter(proxyContractAddress, proxyContractAbi, blockNumber, blockHash)
        }

        if (!ret && DatabaseAbiProvider.getUpgradeEvents(proxyContractAbi).length == 1) {
            ret = await this.findImplementationContractAddressByEvent(proxyContractAddress, proxyContractAbi, blockNumber)
        }

        if (!ret && DatabaseAbiProvider.getImplementationConstructors(proxyContractAbi).length == 1) {
            ret = await this.findImplementationContractAddressByConstructor(proxyContractAddress, proxyContractAbi, blockNumber)
        }

        return ret
    }

    async findImplementationContractAddressByAll(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
        const byGetter = await this.findImplementationContractAddressByGetter(proxyContractAddress, proxyContractAbi, blockNumber)
        const byEvent = await this.findImplementationContractAddressByEvent(proxyContractAddress, proxyContractAbi, blockNumber)
        const byConstructor = await this.findImplementationContractAddressByConstructor(proxyContractAddress, proxyContractAbi, blockNumber)

        if (byGetter && byEvent && byGetter !== byEvent) {
            console.warn(`findImplementationContractAddress results differ byGetter ${byGetter} and byEvent ${byEvent}`)
        }

        if (byGetter && byConstructor && byGetter !== byConstructor) {
            console.warn(`findImplementationContractAddress results differ byGetter ${byGetter} and byConstructor ${byConstructor}`)
        }

        if (byEvent && byConstructor && byEvent !== byConstructor) {
            console.warn(`findImplementationContractAddress results differ byEvent ${byEvent} and byConstructor ${byConstructor}`)
        }

        //TODO revisit logic which result is more reliable byEvent || byGetter || byConstructor

        return byEvent || byGetter || byConstructor
    }

    async findImplementationContractAddressByConstructor(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
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

    async findImplementationContractAddressByEvent(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number): Promise<string | undefined> {
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

    async findImplementationContractAddressByGetter(proxyContractAddress: string, proxyContractAbi: Abi, blockNumber: number, blockHash?: string): Promise<string | undefined> {
        let ret = undefined

        const viewFunctions = DatabaseAbiProvider.getImplementationGetters(proxyContractAbi)

        if (viewFunctions.length != 1) {
            console.warn(`cannot findImplementationContractAddressByGetter from ${viewFunctions.length} viewFunctions in abi for proxy contract ${proxyContractAddress}`)
        } else {
            const viewFnAbi = viewFunctions[0]
            const viewFn = viewFnAbi.name

            const implementations = await this.viewProvider.get(proxyContractAddress, viewFn, blockNumber, blockHash)

            if (implementations.length != 1) {
                console.warn(`cannot findImplementationContractAddressByGetter from ${implementations.length} implementations in results from ${viewFn} for proxy contract ${proxyContractAddress} at block ${blockNumber}`)
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
        const filterstrings = ['implement']
        const regex = new RegExp(filterstrings.join('|'), 'i')

        const implementationGetters = abi.filter(o => {
            const a = o as FunctionAbi
            // if(!a.outputs)
            //   return false
            // const implementOutputs = a.outputs.filter(i => {
            //   return regex.test(i.name)
            // })
            return a.type == 'function' && regex.test(a.name) && a.stateMutability == 'view'
            /*&& implementOutputs.length > 0*/
        })

        console.debug(implementationGetters)

        return implementationGetters
    }

    static isProxy(abi: Abi | undefined) {
        return abi && (DatabaseAbiProvider.getImplementationGetters(abi).length == 1 || DatabaseAbiProvider.getImplementationConstructors(abi).length == 1 || DatabaseAbiProvider.getUpgradeEvents(abi).length == 1)
    }

}
