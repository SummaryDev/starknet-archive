import {Abi, Provider} from "starknet";
import {GetBlockResponse} from "../../types/raw-starknet";
import axios from "axios";
import {ApiError} from "../../helpers/error";
import {ApiProvider} from "../interfaces";

export class FeederApiProvider implements ApiProvider {
  constructor(private readonly provider: Provider) {
  }

  async getBlock(blockNumber: number) {
    let res

    try {
      res = await this.provider.getBlock(blockNumber) as any
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(`feeder cannot getBlock ${blockNumber} for ${err.message}`)
      } else
        throw (err)
    }

    if (res) {
      return res as GetBlockResponse
    }
  }

  async getContractAbi(contractAddress: string) {
    let res

    try {
      res = await this.provider.getCode(contractAddress)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(`feeder cannot getCode ${contractAddress} for ${err.message}`)
      } else
        throw (err)
    }

    if (res) {
      return res.abi
    }
  }

  async getClassAbi(classHash: string) {
    let res
    const method = 'get_class_by_hash'
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    }

    try {
      res = await axios.get(this.provider.feederGatewayUrl + '/' + method + '?classHash=' + classHash, config)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.code === 'ERR_BAD_RESPONSE') {// this error 500 means no class was found so we don't retry but return and try getting abi by contract address
          return
        } else {
          throw new ApiError(`feeder cannot ${method} ${classHash} for ${err.message}`)
        }
      } else
        throw (err)
    }

    if (res && res.data) {
      return res.data.abi
    }
  }

  async callView(contractAddress: string, viewFn: string, blockNumber ?: number) {
    let res

    try {
      res = await this.provider.callContract({
        contractAddress: contractAddress,
        entrypoint: viewFn
      }, {blockIdentifier: blockNumber})
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(`feeder cannot callContract ${contractAddress} ${viewFn} at block ${blockNumber} for ${err.message}`)
      } else
        throw (err)
    }

    if (res) {
      return res.result
    }
  }
}
