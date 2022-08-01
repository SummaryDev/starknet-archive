import {
  BlockResponse,
  OrganizedBlock,
  OrganizedTransaction,
  OrganizedEvent,
  EventResponse,
  TransactionResponse,
  OrganizedFunction
} from "../types/types";
import {ContractCallOrganizer} from "./contract-call";
import {Organizer} from "./organizer";

export class PathfinderOrganizer extends Organizer{

  async organizeBlock(blockResponse: BlockResponse): Promise<OrganizedBlock> {
    const o = blockResponse as any
    const block = o as OrganizedBlock
    block.transactions = await this.organizeTransactions(blockResponse)
    return o
  }

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
        console.debug(`caught while organizing events for transaction ${transaction.transaction_hash} in block ${blockNumber} err=${err}`)
        throw err
      }

      const organizedTransaction = {
        transaction_hash: transaction.transaction_hash,
        l2_to_l1_messages: transaction.l2_to_l1_messages,
        events: organizedEvents
      } as OrganizedTransaction

      if (transaction.hasOwnProperty('entry_point_selector')) {
        organizedTransaction.type = 'INVOKE_FUNCTION';

        const tx = transaction as TransactionResponse

        let organizedFunction: OrganizedFunction = {} as OrganizedFunction

        try {
          organizedFunction = await this.organizeInvokeFunction(tx, blockNumber, blockHash)
        } catch (err) {
          const m = `caught while organizing invoke function for tx ${tx.transaction_hash} in block ${blockNumber} err=${err}`
          console.error(m, err)
          throw err
        }

        organizedTransaction.function = organizedFunction.name
        organizedTransaction.inputs = organizedFunction.inputs

        organizedTransaction.contract_address = tx.contract_address
        if (tx.entry_point_selector != null) {
          organizedTransaction.entry_point_selector = tx.entry_point_selector
        }
        organizedTransaction.max_fee = tx.max_fee
        organizedTransaction.actual_fee = tx.actual_fee

        organizedTransactions.push(organizedTransaction)
      } else if (transaction.hasOwnProperty('contract_address')) {
        organizedTransaction.type = 'DEPLOY';
        const tx = transaction as TransactionResponse

        let organizedFunction: OrganizedFunction = {} as OrganizedFunction
        try {
          organizedFunction = await this.organizeConstructorFunction(tx, blockNumber, blockHash)
        } catch (err) {
          console.debug(`caught while organizing constructor function for tx ${tx.transaction_hash} in block ${blockNumber} err=${err}`)
          throw err
        }

        organizedTransaction.function = organizedFunction.name
        organizedTransaction.inputs = organizedFunction.inputs

        organizedTransaction.contract_address = tx.contract_address
        if (tx.constructor_calldata != null) {
          organizedTransaction.constructor_calldata = tx.constructor_calldata
        }
        organizedTransactions.push(organizedTransaction)
      }else {
        console.debug(`cannot organize transaction ${transaction.transaction_hash} in block ${blockNumber}`)
      }

    }

    return organizedTransactions
  }

  async organizeEvents(events:  EventResponse[], blockNumber: number, blockHash?: string) {
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

  async organizeInvokeFunction(tx: TransactionResponse, blockNumber: number, blockHash?: string) {
    const contractOrganizer = await this.getContractOrganizer(tx.contract_address, blockNumber, blockHash)

    const functionAbi = contractOrganizer.getFunctionAbiFromSelector(tx.entry_point_selector)
    console.debug(functionAbi)

    return this.parseFunction(contractOrganizer, tx.calldata, functionAbi)
  }

  async organizeConstructorFunction(tx: TransactionResponse, blockNumber: number, blockHash?: string) {
    const contractOrganizer = await this.getContractOrganizer(tx.contract_address, blockNumber, blockHash)

    const functionAbi = contractOrganizer.getConstructorFunctionAbi()
    console.debug(functionAbi)

    return this.parseFunction(contractOrganizer, tx.constructor_calldata, functionAbi)
  }
}