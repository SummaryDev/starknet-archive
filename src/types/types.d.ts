import {BigNumberish} from "starknet/dist/utils/number";
import {CompressedCompiledContract } from "starknet/dist/types/lib";

export declare type BlockResponse = {
  block_number: number;
  block_hash: string;
  parent_hash: string;
  old_root: string;
  new_root: string;
  timestamp: number;
  gas_price: string;
  status: string;
  sequencer_address: string;
  transactions: TransactionResponse[];
};

export declare type TransactionResponse = {
  txn_hash: string;
  contract_address: string;
  status: string;
  entry_point_selector?: string;
  messages_sent: string[];
  max_fee: BigNumberish;
  actual_fee: BigNumberish;
  events: EventResponse[];
  calldata?: BigNumberish[];
}

export declare type EventResponse = {
  from_address: string;
  keys: Array<string>;
  data: BigNumberish[];
}

export interface OrganizedTransaction {
  type: string;
  txn_hash: string;
  contract_address: string;
  signature?: string[],
  entry_point_type?: string;
  entry_point_selector: string;
  function?: string;
  inputs?: FunctionInput[];
  nonce?: BigNumberish;
  max_fee?: BigNumberish;
  version?: BigNumberish;
  actual_fee: BigNumberish;
  messages_sent: string[];
  events: OrganizedEvent[];
  contract_definition: CompressedCompiledContract;
  contract_address_salt: BigNumberish;
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
