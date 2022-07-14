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

export class BlockOrganizer extends TransactionCallOrganizer {

  async organizeTransactions(getBlockResponse: GetBlockResponse) {
    const blockNumber = getBlockResponse.block_number
    const blockHash = getBlockResponse.block_hash
    const transactions = getBlockResponse.transactions
    const receipts = getBlockResponse.transaction_receipts as TransactionReceipt[]

    let organizedTransactions: OrganizedTransaction[] = []
    for (const receipt of receipts) {
      //TODO should loop thru receipts or maybe thru transactions? are they one to one?

      let organizedEvents: OrganizedEvent[] = []

      try {
        organizedEvents = await super.organizeEvents(receipt, blockNumber, blockHash)
      } catch (err) {
        const m = `caught while organizing events for receipt ${receipt.transaction_hash} in block ${blockNumber} err=${err}`
        console.error(m, err)
        throw err
      }

      const txType = transactions[receipt.transaction_index].type

      const organizedTransaction = {
        type: txType,
        transaction_hash: receipt.transaction_hash,
        l2_to_l1_messages: receipt.l2_to_l1_messages,
        execution_resources: receipt.execution_resources,
        events: organizedEvents
      } as OrganizedTransaction

      if (txType == 'INVOKE_FUNCTION') {
        const tx = transactions[receipt.transaction_index] as InvokeFunctionTransaction

        let organizedFunction: OrganizedFunction = {} as OrganizedFunction

        try {
          organizedFunction = await super.organizeInvokeFunction(tx, blockNumber, blockHash)
        } catch (err) {
          const m = `caught while organizing invoke function for tx ${tx.transaction_hash} in block ${blockNumber} err=${err}`
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

        organizedTransactions.push(organizedTransaction)

      } else if (txType == 'DEPLOY') {
        const tx = transactions[receipt.transaction_index] as DeployTransaction

        let organizedFunction: OrganizedFunction = {} as OrganizedFunction

        try {
          organizedFunction = await super.organizeConstructorFunction(tx, blockNumber, blockHash)
        } catch (err) {
          const m = `caught while organizing constructor function for tx ${tx.transaction_hash} in block ${blockNumber} err=${err}`
          console.error(m, err)
          throw err
        }

        organizedTransaction.function = organizedFunction.name
        organizedTransaction.inputs = organizedFunction.inputs

        organizedTransaction.contract_address = tx.contract_address
        organizedTransaction.contract_address_salt = tx.contract_address_salt
        organizedTransaction.contract_definition = tx.contract_definition
        organizedTransaction.class_hash = tx.class_hash
        organizedTransaction.constructor_calldata = tx.constructor_calldata
        //TODO use organizedFunction to parse constructor_calldata into inputs

        organizedTransactions.push(organizedTransaction)
      } else {
        console.warn(`cannot organize transaction of type ${txType} ${receipt.transaction_hash} in block ${blockNumber}`)
      }

    } // thru transaction receipts

    return organizedTransactions
  }

  async organizeBlock(getBlockResponse: GetBlockResponse) {
    const o = getBlockResponse as any
    const block = o as OrganizedBlock
    block.transactions = await this.organizeTransactions(getBlockResponse)
    return block
  }
}