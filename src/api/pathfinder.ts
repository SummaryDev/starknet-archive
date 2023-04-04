import * as console from "../helpers/console";
import axios from "axios";
import {Api} from "./interfaces";
import {ApiError} from "../helpers/error";
import {Abi, Block, Transaction, TransactionReceipt} from "../types/raw-starknet";
import {getFullSelector} from "../helpers/helpers";

export class PathfinderApi implements Api {
  constructor(private readonly url: string) {
  }

  async call(method: string, params: any) {
    console.debug(`call ${method} ` + JSON.stringify(params) + ' ' + this.url)

    const data = {
      jsonrpc: '2.0',
      id: +new Date(),
      method: method,
      params: params
    }
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    }

    let res

    try {
      res = await axios.post(this.url, data, config)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(`pathfinder cannot ${method} for ${err.message}`)
      } else {
        throw(err)
      }
    }

    if(res){
      return res.data
    }
  }

  async getBlock(blockNumber: number) {
    const method = 'starknet_getBlockWithTxs'

    const data = await this.call(method, [{block_number: blockNumber}])

    if (data.error)
      throw new Error(`pathfinder cannot ${method} ${blockNumber} for ${data.error.code} ${data.error.message}`)

    return data.result as Block
  }

  async getContractAbi(contractAddress: string, blockNumber?: number): Promise<Abi | undefined>  {
    let ret = undefined

    const method = 'starknet_getClassAt'

    const blockId = blockNumber ? {block_number: blockNumber} : 'latest'

    const data = await this.call(method, {block_id: blockId, contract_address: contractAddress}) // "params\":{\"block_id\": {\"block_number\": 12799},\"contract_address\":\"0xf0f5b3eed258344152e1f17baf84a2e1b621cd754b625bec169e8595aea767\"}

    if (data.error) {
      const m = `pathfinder cannot ${method} ${contractAddress} for ${data.error.code} ${data.error.message}`
      if (data.error.code === 20)// this error 20 Contract not found means no abi was found so we don't retry but return and try getting abi by class hash
        return
      else if (data.error.code === -32603) // this is a recoverable error: -32603 Internal error: Fetching class hash from database
        throw new ApiError(`pathfinder cannot ${method} for ${data.error}`)
      else
        throw new Error(m)
    } else if (data.result && data.result.abi) {
      ret = data.result.abi/*JSON.parse(data.result.abi)*/
    }

    return ret
  }

  async getClassAbi(classHash: string, blockNumber?: number): Promise<Abi | undefined> {
    let ret = undefined

    const method = 'starknet_getClass'

    const blockId = blockNumber ? {block_number: blockNumber} : 'latest'

    const data = await this.call(method, {block_id: blockId, class_hash: classHash}) // "params\":{\"block_id\": {\"block_number\": 12799},\"contract_address\":\"0xf0f5b3eed258344152e1f17baf84a2e1b621cd754b625bec169e8595aea767\"}

    if (data.error) {
      const m = `pathfinder cannot ${method} ${classHash} for ${data.error.code} ${data.error.message}`
      if (data.error.code === 28)// this error 28 Class hash not found means no abi was found so we don't retry but return
        return
      else if (data.error.code === -32603) // this is a recoverable error: -32603 Internal error: Fetching class hash from database
        throw new ApiError(`pathfinder cannot ${method} for ${data.error}`)
      else
        throw new Error(m)
    } else if (data.result && data.result.abi) {
      ret = data.result.abi/*JSON.parse(data.result.abi)*/
    }

    return ret
  }

  async callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string) {
    let blockId: any = {}

    if (blockHash !== undefined) {
      blockId.block_hash = blockHash
    } else if (blockNumber !== undefined) {
      blockId.block_number = blockNumber
    } else {
      blockId = 'latest'
    }

    const entrypoint = getFullSelector(viewFn)
    const params = {
      request: {
        contract_address: contractAddress,
        entry_point_selector: entrypoint,
        calldata: []
      },
      block_id: blockId
    }

    const method = 'starknet_call'

    const data = await this.call(method, params)

    if (data.error) {
      const m = `pathfinder cannot ${method} ${contractAddress} ${viewFn} at block ${blockNumber} for ${data.error.code} ${data.error.message}`
      if (data.error.code === -32603) {
        // Internal error: StarknetErrorCode.TRANSACTION_FAILED //TODO revisit this logic: -32603 Internal error: database is locked is usually recoverable error while -32603 for starknet_call is not so return nothing and don't retry
        console.warn(m)
        return
      } else if (data.error.code === 24) { //TODO revisit this logic: get_implementation at block 12293 for 24 Block not found is rare and unexplainable
        console.warn(m)
        return
      } else if (data.error.code === 21) { //TODO revisit this logic: et_implementation at block 785856 for 21 Invalid message selector
        console.warn(m)
        return
      } else {
        throw new Error(m)
      }
    }


    return data.result
  }

  async getTransactionReceipt(txHash: string) {
    const method = 'starknet_getTransactionReceipt'

    const data = await this.call(method, [txHash])

    if (data.error)
      throw new Error(`pathfinder cannot ${method} ${txHash} for ${data.error.code} ${data.error.message}`)

    return data.result as TransactionReceipt
  }

  async getTransaction(txHash: string) {
    const method = 'starknet_getTransactionByHash'

    const data = await this.call(method, [txHash])

    if (data.error)
      throw new Error(`pathfinder cannot ${method} ${txHash} for ${data.error.code} ${data.error.message}`)

    return data.result as Transaction
  }
}
