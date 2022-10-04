import * as console from "../helpers/console";
import axios from "axios";
import {Api} from "./interfaces";
import {ApiError} from "../helpers/error";
import {Abi, Block, Transaction, TransactionReceipt} from "../types/raw-starknet";

export class AbiApi implements Api {
  constructor(private readonly url?: string) {
    if(!url) {
      this.url = 'https://api-abi-goerli.dev.summary.dev'
    }
  }

  async call(method: string, params: string) {
    console.debug(`call ${method} ${params}`)

    const hash = params/*.replace('x', '')*/

    const url = `${this.url}/api-abi/${method}/${hash}`

    let res

    try {
      res = await axios.get(url)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if(err.response.status === 404) {
          return
        } else if(err.response.status === 400 || err.response.status === 500) {
          throw new Error(`api-abi cannot retry ${url} for error ${err.message}`)
        } else {
          throw new ApiError(`api-abi cannot ${url} for ${err.message}`)
        }
      } else {
        throw(err)
      }
    }

    if(res){
      return res.data as Abi
    }
  }

  async getBlock(blockNumber: number): Promise<Block | undefined> {
    throw new Error('api-abi method not implemented')
  }

  async getContractAbi(contractAddress: string): Promise<Abi | undefined>  {
    return await this.call('contract', contractAddress)
  }

  async getClassAbi(classHash: string): Promise<Abi | undefined> {
    return await this.call('class', classHash)
  }

  async callView(contractAddress: string, viewFn: string, blockNumber?: number, blockHash?: string): Promise<string[] | undefined> {
    throw new Error('api-abi method not implemented')
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | undefined> {
    throw new Error('api-abi method not implemented')
  }

  async getTransaction(txHash: string): Promise<Transaction | undefined> {
    throw new Error('api-abi method not implemented')
  }
}
