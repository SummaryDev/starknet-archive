import {Provider} from "starknet";
import {Block, TransactionReceipt, Transaction} from "../types/raw-starknet";
import axios from "axios";
import {ApiError} from "../helpers/error";
import {Api} from "./interfaces";

export class FeederApi implements Api {
  private readonly provider: Provider
  private readonly feederUrl: string

  constructor(network?: string) {
    if(!network) {
      network = 'goerli-alpha'
    }

    if(network === 'goerli-alpha') {
      this.feederUrl = 'https://alpha4.starknet.io'
    } else {
      this.feederUrl = 'https://mainnet.starknet.io'
    }

    this.provider = new Provider({
      sequencer: {
        network: network as any
      }
    })
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
      return res as Block
    }
  }

  async getContractAbi(contractAddress: string) {
    let res

    try {
      res = await this.provider.getClassAt(contractAddress, 'latest')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(`feeder cannot getClassAt ${contractAddress} for ${err.message}`)
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

    try {
      res = await axios.get(this.feederUrl + '/feeder_gateway/' + method + '?classHash=' + classHash/* + '&block_id=latest'*/)
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
      }, blockNumber)
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

  async getTransactionReceipt(txHash: string) {
    let res

    try {
      res = await this.provider.getTransactionReceipt(txHash)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(`feeder cannot getTransactionReceipt ${txHash} for ${err.message}`)
      } else
        throw (err)
    }

    return res as TransactionReceipt
  }

  async getTransaction(txHash: string) {
    let res

    try {
      res = await this.provider.getTransaction(txHash)
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new ApiError(`feeder cannot getTransaction ${txHash} for ${err.message}`)
      } else
        throw (err)
    }

    return res as Transaction
  }
}
