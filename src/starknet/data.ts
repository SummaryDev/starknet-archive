import {GetBlockResponse as StarknetJsGetBlockResponse, Transaction as StarknetJsTransaction, TransactionReceipt as StarknetJsTransactionReceipt, ExecutionResources as StarknetJsExecutionResources} from 'starknet/types'

export interface StarknetBlock {
  /**
   * Unique block id, following the format <block height>-<first hex digits of the hash>
   */
  id: string

  /**
   * Current block hash
   */
  hash: string

  /**
   * Block height
   */
  height: number

  /**
   * Block timestamp as set by timestamp.now()
   */
  timestamp: number

  /**
   * Hash of the parent block
   */
  parentHash: string

  /**
   * State Merkle root
   */
  stateRoot: string

  /**
   * Gas price
   */
  gasPrice: string

  /**
   * Status
   */
  status: string

  /**
   * Sequencer address
   */
  sequencerAddress: string

  /**
   * An array of basic transaction information
   */
  transactions: TransactionInfo[]

  /**
   * An array of basic transaction receipt information
   */
  transactionReceipts: TransactionReceiptInfo[]
}

/**
 * General block information. Typically, used as a payload for lightweight subscription messages.
 */
export class StarknetBlockInfo {
  height: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  transactions: { id: string; name: string }[];

  constructor(sb: StarknetBlock) {
    this.height = sb.height;
    this.hash = sb.hash;
    this.parentHash = sb.parentHash;
    this.timestamp = sb.timestamp;
    this.height = sb.height;
    this.transactions = sb.transactions;
  }
}

export type Transaction = StarknetJsTransaction & {transaction_hash: string, contract_address: string, entry_point_selector: string, entry_point_type: string, max_fee: string, signature: string[], calldata: string[]}

export type TransactionReceipt = StarknetJsTransactionReceipt & {transaction_hash: string, actual_fee: string, execution_resources: StarknetJsExecutionResources }

export type GetBlockResponse = StarknetJsGetBlockResponse & {transactions: Transaction[], transaction_receipts: TransactionReceipt[], gas_price: string, sequencer_address: string}

export type QualifiedName = string

export interface TransactionInfo {
  id: string
  name: QualifiedName
}

export interface TransactionReceiptInfo {
  id: string
  name: QualifiedName
}

/**
 * Interface representing transactions in blocks from the api
 */
export interface StarknetTransaction {
  /**
   * Transaction id, in the form <blockNumber>-<index>
   */
  id: string

  /**
   * Transaction name, transaction_hash for now
   */
  name: QualifiedName

  /**
   * Contract address, api contract_address
   */
  contractAddress: string

  /**
   * Entry point selector, api entry_point_selector
   */
  entryPointSelector: string

  /**
   * Entry point type, api entry_point_type
   */
  entryPointType: string

  /**
   * Max fee, api max_fee
   */
  maxFee: string

  /**
   * Transaction hash, api transaction_hash
   */
  transactionHash: string

  /**
   * Type, api type
   */
  type: string

  /**
   * Array of transaction signatures, api signature
   */
  signature: string[]

  /**
   * Array of transaction call data entries, api calldata
   */
  calldata: string[]

  // TODO do we need these redundant fields?
  // /**
  //  * Ordinal index in the event array of the current block
  //  */
  // indexInBlock: number
  //
  // /**
  //  * Block height it appeared in
  //  */
  // blockNumber: number
  //
  // /**
  //  * Timestamp of the block, as set by call timestamp.now()
  //  */
  // blockTimestamp: number
}

/**
 * Interface representing transaction receipts in blocks from the api
 */
export interface StarknetTransactionReceipt {
  /**
   * Transaction receipt id, in the form <blockNumber>-<index>
   */
  id: string

  /**
   * Transaction receipt name, transaction_hash for now
   */
  name: QualifiedName

  /**
   * Transaction hash, api transaction_hash
   */
  transactionHash: string

  /**
   * Transaction index, api transaction_index
   */
  transactionIndex: number

  /**
   * Actual fee, api actual_fee
   */
  actualFee: string

  /**
   * Execution resources, api execution_resources
   */
  executionResources: ExecutionResources

  /**
   * Array of events, api events
   */
  events: StarknetEvent[]

  /**
   * Array of messages from L2 to L1, api l2_l1_messages
   */
  l2l1Messages: string[]

  /**
   * Consumed message from L1 to L2, api l1_to_l2_consumed_message
   */
  l1l2ConsumedMessage?: ConsumedMessage

  // TODO do we need these redundant fields?
  // /**
  //  * Ordinal index in the event array of the current block
  //  */
  // indexInBlock: number
}

export interface ExecutionResources {
  nMemoryHoles: number
  nSteps: number
  //TODO add builtin_instance_counter
}

export interface ConsumedMessage {
  fromAddress: string
  toAddress: string
  nonce: string
  selector: string
  payload: string[]
}

export interface StarknetEvent {
  fromAddress: string
  keys: string[]
  data: string[]
}
