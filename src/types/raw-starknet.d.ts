import {
  Transaction,
  BlockNumber,
  Status,
  FunctionAbi,
  StructAbi,
  ExecutionResources
} from "starknet"
import {BigNumberish} from "starknet/dist/utils/number";
import {CompressedCompiledContract, EntryPointType, RawCalldata, Signature} from "starknet/dist/types/lib";

export declare type Event = {
  from_address: string;
  keys: Array<string>;
  data: RawCalldata;
};

export declare type GetBlockResponse = {
  block_number: number;
  state_root: string;
  block_hash: string;
  transactions: Transaction[];
  timestamp: number;
  transaction_receipts: TransactionReceipt[];
  parent_block_hash: string;
  status: Status;
  gas_price: string,
  sequencer_address: string
};

export declare type Transaction = DeployTransaction | InvokeFunctionTransaction;

export declare type DeployTransaction = {
  type: 'DEPLOY';
  transaction_hash: string;
  contract_address: string;
  contract_address_salt: BigNumberish;
  class_hash: string;
  constructor_calldata: string[];
  contract_definition: CompressedCompiledContract;
  nonce?: BigNumberish;
};

export declare type InvokeFunctionTransaction = {
  type: 'INVOKE_FUNCTION';
  transaction_hash: string;
  contract_address: string;
  signature?: Signature;
  entry_point_type?: EntryPointType;
  entry_point_selector: string;
  calldata?: RawCalldata;
  nonce?: BigNumberish;
  max_fee?: BigNumberish;
  version?: BigNumberish;
};

export declare type TransactionReceipt = {
  // status: Status;
  transaction_hash: string;
  transaction_index: number;
  // block_hash: string;
  // block_number: BlockNumber;
  l2_to_l1_messages: string[];
  events: Event[];
  actual_fee: string;
  execution_resources: ExecutionResources
};

export declare type GetCodeResponse = {
  bytecode: string[];
  abi: Abi;
};

export declare type EventAbi = {
  data: { name: string, type: string }[],
  keys: string[],
  name: string,
  type: 'event'
};

export declare type Abi = Array<FunctionAbi | StructAbi | EventAbi>;