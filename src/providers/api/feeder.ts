import {Abi, Provider} from "starknet";
import {GetBlockResponse} from "starknet-parser/src/types/rawStarknet";
import axios from "axios";
import {ApiError} from "../../helpers/error";
import {ApiProvider} from "../interfaces";

export class FeederApiProvider implements ApiProvider {
  constructor(private readonly provider: Provider) {
  }

  async getBlock(blockNumber: number) {
    let ret
    try {
      const res = await this.provider.getBlock(blockNumber) as any
      ret = res as GetBlockResponse
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(err.message)
      } else
        throw (err)
    }
    return ret
  }

  async getContractAbi(contractAddress: string) {
    let ret
    try {
      const res = await this.provider.getCode(contractAddress)
      ret = res.abi
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(err.message)
      } else
        throw (err)
    }
    return ret
  }

  async getClassAbi(classHash: string) {
    let ret

    const method = 'get_class_by_hash'
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    }
    const res = await axios.get(this.provider.feederGatewayUrl + '/' + method + '?classHash=' + classHash, config)

    if (res.data.error) {
      const m = `error from feeder ${method} ${classHash} ${res.data.error.code} ${res.data.error.message}`
      // if (res.data.error.code === 20)
      //   console.warn(m)
      // else
        throw new Error(m) //TODO check if recoverable and throw ApiError?
    } else if (res.data.abi) {
      ret = res.data.abi
    }

    return ret
  }

  async callView(contractAddress: string, viewFn: string, blockNumber?: number) {
    let ret
    try {
      const res = await this.provider.callContract({
        contractAddress: contractAddress,
        entrypoint: viewFn
      }, {blockIdentifier: blockNumber})
      ret = res.result
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(err.message)
      } else
        throw (err)
    }
    return ret
  }
}
