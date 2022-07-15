import * as console from "starknet-parser/lib/helpers/console";
import axios from "axios";
import {Abi, GetBlockResponse} from "starknet-parser/src/types/rawStarknet";
import {getFullSelector} from "starknet-parser/lib/helpers/helpers";
import {ApiError} from "../../helpers/error";
import {ApiProvider} from "../interfaces";
import JSON = require("json5")

export class PathfinderApiProvider implements ApiProvider {
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
    const res = await axios.post(this.url, data, config)

    if (res.data.error && res.data.error.code === -32603) // recoverable Internal error: database is locked
      throw new ApiError(`error from pathfinder ${method} ${res.data.error.code} ${res.data.error.message}`)

    return res.data
  }

  async getBlock(blockNumber: number) {
    const method = 'starknet_getBlockByNumber'

    const data = await this.call(method, [blockNumber, 'FULL_TXN_AND_RECEIPTS'])

    if (data.error)
      throw new Error(`error from pathfinder ${method} ${blockNumber} ${data.error.code} ${data.error.message}`)

    return data.result as GetBlockResponse
  }

  async getContractAbi(contractAddress: string) {
    let ret = undefined

    const method = 'starknet_getCode'

    const data = await this.call(method, [contractAddress])

    if (data.error) {
      const m = `error from pathfinder ${method} ${contractAddress} ${data.error.code} ${data.error.message}`
      if (data.error.code === 20)
        console.warn(m)
      else
        throw new Error(m)
    } else if (data.result.abi) {
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

    if (data.error)
      throw new Error(`error from pathfinder ${method} ${viewFn} at block ${blockNumber} ${data.error.code} ${data.error.message}`)

    return data.result
  }
}
