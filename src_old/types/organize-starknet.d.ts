import {BigNumber} from "ethers";
import {AbiEntry} from 'starknet';
import {
  EventAbi,
  TransactionReceipt,
  GetBlockResponse,
  InvokeFunctionTransaction,
  DeployTransaction, FunctionAbi
} from "./raw-starknet";
import {BigNumberish} from 'starknet/utils'
import {
  Transaction as StarknetJsTransaction,
  TransactionReceipt as StarknetJsTransactionReceipt,
  ExecutionResources
} from "starknet";
import {CompressedCompiledContract, EntryPointType, Signature} from "starknet/dist/types/lib";
import BN from 'bn.js';

export interface ContractInfos {
  [key: string]: {
    transactionCount: number,
    type: string
  }
}

export interface AccountCallArray {
  to: BigNumber,
  selector: BigNumber,
  dataOffset: BigNumber,
  dataLen: BigNumber
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

export interface StarknetStruct {
  size: number,
  properties: (AbiEntry & { offset: number; })[] | []
}

export type StarknetArgument = { [key: string]: any } | BigNumber;

export interface CallArray {
  to: BigNumber,
  selector: BigNumber,
  dataOffset: BigNumber,
  dataLen: BigNumber
}

// export interface Transaction extends StarknetJsTransaction {
//   transaction_hash: string
// }
//
// export interface TransactionReceipt extends StarknetJsTransactionReceipt {
//   actual_fee: string, execution_resources: ExecutionResources
// }

// export interface Block extends Omit<GetBlockResponse, ['transactions', 'transactions_receipts']> {
//   transactions: OrganizedTransaction[],
//   transaction_receipts: TransactionReceipt[],
//   gas_price: string,
//   sequencer_address: string
// }

export interface OrganizedBlock extends Omit<GetBlockResponse, ['transactions', 'transactions_receipts']> {
  transactions: OrganizedTransaction[]
}

export interface FunctionCall {
  name: string;
  to: BigNumber;
  calldata: any;
}

export interface OrganizedFunction {
  name: string;
  inputs?: FunctionInput[];
  outputs?: FunctionInput[];
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

export type OrganizedCalldata = StarknetArgument | StarknetArgument[];

export interface OrganizedEvent {
  name: string,
  transmitter_contract: string,
  arguments: EventArgument[]
}

export interface OrganizedTransaction {
  type: string,//TODO enum?
  // InvokeFunctionTransaction
  transaction_hash: string,
  contract_address: string,
  signature?: Signature,
  entry_point_type?: EntryPointType,//TODO enum?
  entry_point_selector: string,
  function?: string,
  inputs?: FunctionInput[],
  nonce?: BigNumberish,
  max_fee?: BigNumberish,//TODO number or BigNumberish?
  version?: BigNumberish,
  // TransactionReceipt
  actual_fee: BigNumberish,//TODO number?
  l2_to_l1_messages: string[],
  events: OrganizedEvent[],
  execution_resources: ExecutionResources
  //DeployTransaction
  contract_definition: CompressedCompiledContract,
  contract_address_salt: BigNumberish,
  class_hash: string,
  constructor_calldata: string[]
}

export interface OrganizedTransfer {
  from: string,
  to: string,
  value: BigNumber,
  hash: string,
  symbol: string,
  decimals: number
}

export type TransfersTree = { received: OrganizedTransfer[] | undefined, sent: OrganizedTransfer[] | undefined };

export interface TransfersTreePerAccount {
  [address: string]: TransfersTree
}

export interface OrganizedSwap {
  swapperAddress: string;
  tokenIn: {
    amount: BigNumber;
    address: string;
    symbol: string;
    decimals: number;
  };
  tokenOut: {
    amount: BigNumber;
    address: string;
    symbol: string;
    decimals: number;
  };
}

export interface SwappersTree {
  [address: string]: OrganizedSwap[]
}