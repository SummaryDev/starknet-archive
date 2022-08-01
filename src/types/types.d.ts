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
  transaction_hash: string;
  contract_address: string;
  status: string;
  entry_point_selector: string;
  messages_sent: string[];
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
  messages_sent: string[];
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

export declare type Abi = Array<FunctionAbi | StructAbi | EventAbi>;

export type StarknetArgument = { [key: string]: any } | BigNumber;
