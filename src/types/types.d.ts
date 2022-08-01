import {StarknetStruct} from "./organize-starknet";

export declare type BlockResponse = {
  block_number: number;
  block_hash: string;
  parent_block_hash: string;
  state_root: string;
  new_root: string;
  timestamp: number;
  gas_price: string;
  status: string;
  sequencer_address: string;
  transactions: TransactionResponse[];
};

export declare type TransactionResponse = {
  transaction_hash: string;
  contract_address: string;
  status: string;
  entry_point_selector: string;
  l2_to_l1_messages: string[];
  max_fee: string;
  actual_fee: string;
  events: EventResponse[];
  calldata?: string[];
  constructor_calldata?: string[];
}

export declare type EventResponse = {
  from_address: string;
  keys: Array<string>;
  data: string[];
}

export interface OrganizedBlock extends Omit<BlockResponse, ['transactions']> {
  transactions: OrganizedTransaction[]
}

export interface OrganizedTransaction {
  type: string;
  transaction_hash: string;
  contract_address: string;
  signature?: string[],
  entry_point_type?: string;
  entry_point_selector: string;
  function?: string;
  inputs?: FunctionInput[];
  nonce?: string;
  max_fee?: string;
  version?: string;
  actual_fee: string;
  l2_to_l1_messages: string[];
  events: OrganizedEvent[];
  contract_address_salt: string;
  class_hash: string;
  constructor_calldata: string[];
}

export interface OrganizedEvent {
  name: string,
  transmitter_contract: string,
  arguments: EventArgument[]
}

export interface FunctionInput {
  name: string;
  type: string;
  value: any;
  decimal?: string;
}

export interface EventArgument {
  name: string;
  type: string;
  value: any;
  decimal?: string;
}

export interface OrganizedFunction {
  name: string;
  inputs?: FunctionInput[];
  outputs?: FunctionInput[];
}

export type AbiEntry = { name: string; type: 'felt' | 'felt*' | string };

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

export declare type EventAbi = {
  data: { name: string, type: string }[],
  keys: string[],
  name: string,
  type: 'event'
};

export declare type Abi = Array<FunctionAbi | StructAbi | EventAbi>;

export type StarknetArgument = { [key: string]: any } | BigNumber;

export interface StarknetContractCode {
  functions: OrganizedFunctionAbi,
  structs: OrganizedStructAbi,
  events: OrganizedEventAbi,
  constructorFunction: FunctionAbi
}

export interface OrganizedFunctionAbi {
  [selector: string]: FunctionAbi
}

export interface OrganizedStructAbi {
  [key: string]: StarknetStruct
}

export interface OrganizedEventAbi {
  [key: string]: EventAbi
}
export type OrganizedCalldata = StarknetArgument | StarknetArgument[];
