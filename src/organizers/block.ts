import {
  GetBlockResponse,
  TransactionReceipt,
  InvokeFunctionTransaction,
  DeployTransaction
} from "../types/raw-starknet"
import {
  OrganizedEvent,
  OrganizedTransaction, OrganizedFunction, OrganizedBlock
} from "../types/organize-starknet"
import {TransactionCallOrganizer} from "./transaction-call"
import * as console from '../helpers/console'
import {AbiProvider, ApiProvider} from "../providers/interfaces";

export class BlockOrganizer extends TransactionCallOrganizer {

  constructor(private readonly apiProvider: ApiProvider, abiProvider: AbiProvider) {
    super(abiProvider)
  }

  async organizeTransactions(getBlockResponse: GetBlockResponse) {
    const blockNumber = getBlockResponse.block_number
    const blockHash = getBlockResponse.block_hash
    const transactions = getBlockResponse.transactions

    let organizedTransactions = [] as OrganizedTransaction[]

    for (const tx of transactions) {
      const organizedTransaction = tx as OrganizedTransaction

      const receipt = await this.apiProvider.getTransactionReceipt(tx.transaction_hash)

      if(receipt) {
        organizedTransaction.status = receipt.status
        organizedTransaction.status_data = receipt.status_data
        organizedTransaction.actual_fee = receipt.actual_fee
        organizedTransaction.messages_sent = receipt.messages_sent
        organizedTransaction.l1_origin_message = receipt.l1_origin_message

        if(receipt.events) {
          try {
            organizedTransaction.events = await super.organizeEvents(receipt.events, blockNumber, blockHash)
          } catch (err) {
            console.debug(`caught while organizing events for receipt ${receipt.transaction_hash} in block ${blockNumber} err=${err}`)
            throw err
          }
        }
      }

      if (tx.type == 'INVOKE') {
        let organizedFunction = {} as OrganizedFunction

        try {
          organizedFunction = await super.organizeFunction(tx, blockNumber, blockHash)
        } catch (err) {
          console.debug(`caught while organizing function for tx ${tx.transaction_hash} in block ${blockNumber} err=${err}`)
          throw err
        }

        organizedTransaction.function = organizedFunction.name
        organizedTransaction.inputs = organizedFunction.inputs

      } else if (tx.type == 'L1_HANDLER') {
        let organizedFunction = {} as OrganizedFunction

        try {
          organizedFunction = await super.organizeFunction(tx, blockNumber, blockHash)
        } catch (err) {
          console.debug(`caught while organizing function for tx ${tx.transaction_hash} in block ${blockNumber} err=${err}`)
          throw err
        }

        organizedTransaction.function = organizedFunction.name
        organizedTransaction.inputs = organizedFunction.inputs
      } else if (tx.type == 'DEPLOY') {
        let organizedFunction: OrganizedFunction = {} as OrganizedFunction

        try {
          organizedFunction = await super.organizeConstructorFunction(tx, blockNumber, blockHash)
        } catch (err) {
          console.debug(`caught while organizing constructor function for tx ${tx.transaction_hash} in block ${blockNumber} err=${err}`)
          throw err
        }

        organizedTransaction.function = organizedFunction.name
        organizedTransaction.inputs = organizedFunction.inputs

      }

      const cleanedTransaction = organizedTransaction as any
      delete cleanedTransaction.calldata
      delete cleanedTransaction.constructor_calldata

      organizedTransactions.push(cleanedTransaction)

    } // thru transactions

    return organizedTransactions
  }

  async organizeBlock(getBlockResponse: GetBlockResponse) {
    const o = getBlockResponse as any
    const block = o as OrganizedBlock
    block.transactions = await this.organizeTransactions(getBlockResponse)
    return block
  }
}