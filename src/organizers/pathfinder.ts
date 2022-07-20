import {
  GetBlockResponse,
  Transaction, InvokeFunctionTransaction
} from "../types/raw-starknet"
import {
  OrganizedEvent,
  OrganizedTransaction, OrganizedFunction, OrganizedBlock
} from "../types/organize-starknet"

import {Organizer} from "./organizer";
import * as console from "../helpers/console";

export class PathfinderOrganizer extends Organizer {

  async organizeTransactions(block: GetBlockResponse) {
    const blockNumber = block.block_number
    const blockHash = block.block_hash
    const transactions = block.transactions as Transaction[]

    let organizedTransactions: OrganizedTransaction[] = []

    for (const transaction of transactions) {
      let organizedEvents = new Array<OrganizedEvent>();
      try {
        organizedEvents = await this.organizeEvents(transaction, blockNumber, blockHash)
        console.debug(organizedEvents)
      } catch (err) {
        const m = `caught while organizing events for receipt ${transaction.txn_hash} in block ${blockNumber} err=${err}`
        console.error(m, err)
        throw err
      }

      const organizedTransaction = {
        transaction_hash: transaction.txn_hash,
        l2_to_l1_messages: transaction.messages_sent,
        events: organizedEvents
      } as OrganizedTransaction

      if (transaction.hasOwnProperty('entry_point_selector')) {
        organizedTransaction.type = 'INVOKE_FUNCTION';

        const tx = transaction as InvokeFunctionTransaction

        let organizedFunction: OrganizedFunction = {} as OrganizedFunction

        try {
          organizedFunction = await this.organizeInvokeFunction(tx, blockNumber, blockHash)
        } catch (err) {
          const m = `caught while organizing invoke function for tx ${tx.txn_hash} in block ${blockNumber} err=${err}`
          console.error(m, err)
          throw err
        }

        organizedTransaction.function = organizedFunction.name
        organizedTransaction.inputs = organizedFunction.inputs

        organizedTransaction.contract_address = tx.contract_address
        organizedTransaction.signature = tx.signature
        organizedTransaction.entry_point_type = tx.entry_point_type
        organizedTransaction.entry_point_selector = tx.entry_point_selector
        organizedTransaction.nonce = tx.nonce
        organizedTransaction.max_fee = tx.max_fee
        organizedTransaction.version = tx.version
        organizedTransaction.actual_fee = tx.actual_fee

        organizedTransactions.push(organizedTransaction)
      }

    }

    return organizedTransactions
  }

  async organizeBlock(block: GetBlockResponse) {
    const transactions = await this.organizeTransactions(block)
    const res = {
      block_number: block.block_number,
      block_hash: block.block_hash,
      state_root: block.old_root,
      new_root: block.new_root,
      timestamp: block.accepted_time,
      parent_block_hash: block.parent_hash,
      sequencer_address: block.sequencer,
      gas_price: block.gas_price,
      status: block.status,
    } as OrganizedBlock

    res.transactions = transactions
    return res
  }

}