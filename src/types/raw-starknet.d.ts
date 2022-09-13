import BN, { isBN } from 'bn.js';

export type Status =
  | 'NOT_RECEIVED'
  | 'RECEIVED'
  | 'PENDING'
  | 'ACCEPTED_ON_L2'
  | 'ACCEPTED_ON_L1'
  | 'REJECTED';

export type BigNumberish = string | number | BN;

export type Signature = string[];
export type RawCalldata = BigNumberish[];

export declare type Event = {
  from_address: string;
  keys: Array<string>;
  data: RawCalldata;
};

export interface MessageToL1 {
  to_address: string;
  payload: Array<string>;
}

export interface MessageToL2 {
  from_address: string;
  payload: Array<string>;
}

export declare type GetBlockResponse = {
  block_number: number;
  block_hash: string;
  new_root: string;
  parent_hash: string;
  sequencer_address?: string;
  status: Status;
  transactions: Transaction[];
  timestamp: number;
};

export declare type Transaction = DeclareTransaction | DeployTransaction | InvokeFunctionTransaction;

export declare type DeployTransaction = {
  type: 'DEPLOY';
  transaction_hash: string;
  class_hash: string;
  contract_address: string;
  contract_address_salt: BigNumberish;
  version?: BigNumberish;
  constructor_calldata?: RawCalldata;
};

export declare type DeclareTransaction = {
  type: 'DECLARE';
  transaction_hash: string;
  class_hash: string;
  sender_address: string;
  max_fee?: BigNumberish;
  nonce?: BigNumberish;
  signature?: Signature;
  version?: BigNumberish;
};

export declare type InvokeFunctionTransaction = {
  type: 'INVOKE';
  transaction_hash: string;
  contract_address: string;
  entry_point_selector: string;
  max_fee?: BigNumberish;
  nonce?: BigNumberish;
  signature?: Signature;
  version?: BigNumberish;
  calldata?: RawCalldata;
};

export declare type TransactionReceipt = {
  // CommonTransactionReceiptResponse
  transaction_hash: string;
  status: Status;
  actual_fee?: BigNumberish;
  status_data?: string;
  // InvokeTransactionReceiptResponse
  messages_sent?: Array<MessageToL1>;
  events?: Array<Event>;
  l1_origin_message?: MessageToL2;
};

export declare type GetCodeResponse = {
  bytecode: string[];
  abi: Abi;
};

export type AbiEntry = { name: string; type: 'felt' | 'felt*' | string };

export declare type EventAbi = {
  data: { name: string, type: string }[],
  keys: string[],
  name: string,
  type: 'event'
};

export declare type FunctionAbi = {
  inputs: AbiEntry[];
  name: string;
  outputs: AbiEntry[];
  stateMutability?: 'view';
  type: 'function' | 'constructor' | 'l1_handler';
};

export type StructAbi = {
  members: (AbiEntry & { offset: number })[];
  name: string;
  size: number;
  type: 'struct';
};

export declare type Abi = Array<FunctionAbi | StructAbi | EventAbi>;