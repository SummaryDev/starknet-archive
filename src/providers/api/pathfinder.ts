import * as console from "../../helpers/console";
import axios from "axios";
import {ApiError} from "../../helpers/error";
import {ApiProvider} from "../../interfaces";
import {BlockResponse,TransactionResponse,EventResponse, Abi} from "../../types/types";
import {getFullSelector} from "../../helpers/helpers";

export class PathfinderApiProvider implements ApiProvider{
  constructor(private readonly url: string) {
  }

  async call(method: string, params: any) {
    console.debug(`call ${method}`)

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

  async getBlock(blockNumber: number): Promise<BlockResponse> {
    const method = 'starknet_getBlockByNumber'

    const data = await this.call(method, [blockNumber, 'FULL_TXN_AND_RECEIPTS'])

    if (data.error)
      throw new Error(`pathfinder cannot ${method} ${blockNumber} for ${data.error.code} ${data.error.message}`)

    const block = data.result
    const transactions = new Array<TransactionResponse>()
    const events = new Array<EventResponse>()

    const response: BlockResponse = {
      block_number: block.block_number,
      block_hash: block.block_hash,
      parent_hash: block.parent_hash,
      old_root: block.old_root,
      new_root: block.new_root,
      timestamp: block.accepted_time,
      gas_price: block.gas_price,
      status: block.status,
      sequencer_address: block.sequencer,
      transactions,
    }

    for (const transaction of block.transactions) {
      const t: TransactionResponse = {
        transaction_hash: transaction.txn_hash,
        contract_address: transaction.contract_address,
        entry_point_selector: transaction.entry_point_selector,
        calldata: transaction.calldata,
        constructor_calldata: transaction.constructor_calldata,
        max_fee: transaction.max_fee,
        actual_fee: transaction.actual_fee,
        status: transaction.status,
        messages_sent: transaction.messages_sent,
        events,
      }

      for (const event of transaction.events) {
        const e: EventResponse = {
          from_address: event.from_address,
          keys: event.keys,
          data: event.data,
        }

        events.push(event)
      }

      t.events = events

      transactions.push(t)
    }

    response.transactions = transactions
    return response

  }

  async getContractAbi(contractAddress: string) {
    let ret = undefined

    const method = 'starknet_getCode'

    const data = await this.call(method, [contractAddress])

    if (data.error) {
      const m = `pathfinder cannot ${method} ${contractAddress} for ${data.error.code} ${data.error.message}`
      if (data.error.code === 20)// this error 20 Contract not found means no abi was found so we don't retry but return and try getting abi by class hash
        return
      else
        throw new Error(m)
    } else if (data.result && data.result.abi) {
      ret = JSON.parse(data.result.abi)
    }

    return ret
  }

  async getClassAbi(classHash: string): Promise<Abi> {
    throw new Error('pathfinder does not return ABI by starknet_getClass') //TODO revisit as future versions of pathfinder may start supporting ABI in starknet_getClass
  }

  async callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string) {
    if (blockHash === undefined) {
      if (blockNumber !== undefined) {
        const b = await this.call('starknet_getBlockByNumber', [blockNumber])
        blockHash = b.result.block_hash
      } else {
        blockHash = 'latest'
      }
    }

    const entrypoint = getFullSelector(viewFn)
    const params = {
      request: {
        contract_address: contractAddress,
        entry_point_selector: entrypoint,
        calldata: []
      },
      block_hash: blockHash
    }

    const method = 'starknet_call'

    const data = await this.call(method, params)

    if (data.error) {
      const m = `pathfinder cannot ${method} ${contractAddress} ${viewFn} at block ${blockNumber} for ${data.error.code} ${data.error.message}`
      if (data.error.code === -32603) {
        // Internal error: StarknetErrorCode.TRANSACTION_FAILED //TODO -32603 Internal error: database is locked is also a recoverable error while -32603 for starknet_call is not
        console.warn(m)
        return
      } else {
        throw new Error(m)
      }
    }


    return data.result
  }
}