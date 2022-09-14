import {
  BigNumberish,
  MessageToL1,
  MessageToL2,
  Status,
  Signature,
  RawCalldata
} from "./raw-starknet";

export interface OrganizedBlock {
  block_number: number;
  block_hash: string;
  new_root: string;
  parent_hash: string;
  sequencer_address?: string;
  status: Status;
  timestamp: number;

  transactions: OrganizedTransaction[]
}

export interface OrganizedFunction {
  name: string;
  inputs?: FunctionInput[];
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

export interface OrganizedEvent {
  name: string,
  transmitter_contract: string,
  arguments: EventArgument[]
}

export interface OrganizedTransaction {
  type: string,
  transaction_hash: string,
  contract_address: string,
  entry_point_selector: string,

  max_fee?: BigNumberish,
  nonce?: BigNumberish,
  version?: BigNumberish,
  signature?: Signature,

  function?: string,
  inputs?: FunctionInput[],

  // TransactionReceipt
  status: Status,
  status_data?: string,
  actual_fee?: BigNumberish,
  messages_sent?: Array<MessageToL1>,
  events: OrganizedEvent[],
  l1_origin_message?: MessageToL2,

  // DeployTransaction
  contract_address: string,
  contract_address_salt: BigNumberish,
  constructor_calldata?: RawCalldata,

  // DeclareTransaction
  class_hash: string,
  sender_address: string,
}

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

export type StarknetArgument = { [key: string]: any } | BigNumber;