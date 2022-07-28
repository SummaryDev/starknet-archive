import * as console from "../helpers/console";
import {BlockResponse, EventResponse, OrganizedEvent, OrganizedFunction, OrganizedTransaction} from "../types/types";
import {TransactionCallOrganizer} from "./transaction-call";

export class PathfinderOrganizer extends TransactionCallOrganizer{
  async organizeTransactions(blockResponse: BlockResponse) {
    const blockNumber = blockResponse.block_number
    const blockHash = blockResponse.block_hash
    const transactions = blockResponse.transactions

    let organizedTransactions: OrganizedTransaction[] = []

    for (const transaction of transactions) {

      let organizedEvents: OrganizedEvent[] = []

      try {
        organizedEvents = await this.organizeEvents(transaction.events, blockNumber, blockHash)
      } catch (err) {
        console.debug(`caught while organizing events for transaction ${transaction.txn_hash} in block ${blockNumber} err=${err}`)
        throw err
      }


      // const organizedTransaction = {
      //   txn_hash: transaction.txn_hash,
      //   messages_sent: transaction.messages_sent,
      //   // events: organizedEvents
      // } as OrganizedTransaction
      //
      // if (txType == 'INVOKE_FUNCTION') {
      //   const tx = transactions[receipt.transaction_index] as InvokeFunctionTransaction
      //
      //   organizedTransaction.type = 'INVOKE_FUNCTION'
      //   let organizedFunction: OrganizedFunction = {} as OrganizedFunction
      //
      //   try {
      //     organizedFunction = await super.organizeInvokeFunction(tx, blockNumber, blockHash)
      //   } catch (err) {
      //     console.debug(`caught while organizing invoke function for tx ${tx.transaction_hash} in block ${blockNumber} err=${err}`)
      //     throw err
      //   }
      //
      //   organizedTransaction.function = organizedFunction.name
      //   organizedTransaction.inputs = organizedFunction.inputs
      //
      //   organizedTransaction.contract_address = tx.contract_address
      //   organizedTransaction.signature = tx.signature
      //   organizedTransaction.entry_point_type = tx.entry_point_type
      //   organizedTransaction.entry_point_selector = tx.entry_point_selector
      //   organizedTransaction.nonce = tx.nonce
      //   organizedTransaction.max_fee = tx.max_fee
      //   organizedTransaction.version = tx.version
      //
      //   organizedTransactions.push(organizedTransaction)
      //
      // }  else {
      //   console.debug(`cannot organize transaction hash: ${transaction.txn_hash} in block ${blockNumber}`)
      // }

    }

    return organizedTransactions
  }

  async organizeBlock(blockResponse: BlockResponse) {
    const o = blockResponse as any
    // const block = o as OrganizedBlock
    // // block.transactions = await this.organizeTransactions(getBlockResponse)
    // return block
  }

  async organizeEvents(events: EventResponse[], blockNumber: number, blockHash?: string) {
    let organizedEvents: OrganizedEvent[] = []

    for (const event of events) {
      const contractAnalyzer = await this.getContractOrganizer(event.from_address, blockNumber, blockHash)
      const eventCalldata = contractAnalyzer.organizeEvent(event)
      if (eventCalldata) {
        organizedEvents.push(eventCalldata)
      }
    }

    return organizedEvents
  }
}