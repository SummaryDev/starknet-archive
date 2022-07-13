import * as console from "starknet-parser/lib/helpers/console";
import axios from "axios";
import { GetBlockResponse } from "starknet-parser/src/types/rawStarknet";
import { getFullSelector } from "starknet-parser/lib/helpers/helpers";
import { ApiError } from "../../helpers/error";
import { ApiProvider } from "../interfaces";

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

    if (res.data.error && res.data.error.code === -32603) // Internal error: database is locked
      throw new ApiError(`error from pathfinder ${method} ${res.data.error.code} ${res.data.error.message}`)

    return res.data
  }

  async getBlock(blockNumber: number) {
    const data = await this.call('starknet_getBlockByNumber', [blockNumber, 'FULL_TXN_AND_RECEIPTS'])

    if (data.error)
      throw new Error(`error from pathfinder starknet_getBlockByNumber ${blockNumber} ${data.error.code} ${data.error.message}`)

    return data.result as GetBlockResponse
  }

  async getAbi(contractAddress: string) {
    let ret = undefined

    const data = await this.call('starknet_getCode', [contractAddress])

    if (data.error) {
      const m = `error from pathfinder starknet_getCode ${contractAddress} ${data.error.code} ${data.error.message}`
      if (data.error.code === 20)
        console.warn(m)
      else
        throw new Error(m)
    } else if (data.result.abi) {
      ret = JSON.parse(data.result.abi)
    }

    return ret
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

    const data = await this.call('starknet_call', params)

    if (data.error)
      throw new Error(`error from pathfinder starknet_call ${viewFn} at block ${blockNumber} ${data.error.code} ${data.error.message}`)

    return data.result
  }
}
