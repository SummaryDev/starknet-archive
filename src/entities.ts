import {EntitySchema} from 'typeorm';
import {OrganizedBlock, OrganizedTransaction, OrganizedEvent, FunctionInput, EventArgument} from "starknet-parser/src/types/organizedStarknet";

export const BlockEntity = new EntitySchema<OrganizedBlock>({
  name: "block",
  columns: {
    block_number: {
      type: Number,
      primary: true
    },
    block_hash: {
      type: String
    },
    parent_block_hash: {
      type: String,
      nullable: true
    },
    state_root: {
      type: String
    },
    timestamp: {
      type: Number
    },
    status: {
      type: String,
      nullable: true
    },
    gas_price: {
      type: String,
      nullable: true
    },
    sequencer_address: {
      type: String,
      nullable: true
    },
  },
  relations: {
    transactions: {
      type: "one-to-many",
      target: "transaction",
      inverseSide: 'block',
      cascade: true
    }
  }
})

export const TransactionEntity = new EntitySchema<OrganizedTransaction & {block: OrganizedBlock, /*blockBlockNumber: number*/}>({
  name: "transaction",
  columns: {
    transaction_hash: {
      type: String,
      primary: true
    },
    contract_address: {
      type: String
    },
    type: {
      type: String
    },
    entry_point_selector: {
      type: String,
      nullable: true
    },
    entry_point_type: {
      type: String,
      nullable: true
    },
    nonce: {
      type: String,
      nullable: true
    },
    max_fee: {
      type: String,
      nullable: true
    },
    version: {
      type: String,
      nullable: true
    },
    signature: {
      type: 'jsonb',
      nullable: true
    },
    function: {
      type: String,
      nullable: true
    },
    actual_fee: {
      type: String,
      nullable: true
    },
    l2_to_l1_messages: {
      type: 'jsonb',
      nullable: true
    },
    execution_resources: {
      type: 'jsonb',
      nullable: true
    },
    contract_definition: {
      type: 'jsonb',
      nullable: true
    },
    contract_address_salt: {
      type: String,
      nullable: true
    },
    class_hash: {
      type: String,
      nullable: true
    },
    constructor_calldata: {
      type: 'jsonb',
      nullable: true
    },
    // blockBlockNumber: {
    //   type: Number
    // },
  },
  relations: {
    block: {
      type: "many-to-one",
      target: "block",
      joinColumn: true,
      inverseSide: 'transactions',
    },
    inputs: {
      type: "one-to-many",
      target: "input",
      inverseSide: 'transaction',
      cascade: true
    },
    events: {
      type: "one-to-many",
      target: "event",
      inverseSide: 'transaction',
      cascade: true
    }
  },
  // indices: [
  //   {
  //     name: 'transaction_blockBlockNumber_index',
  //     columns: [
  //       'blockBlockNumber'
  //     ]
  //   },
  //   {
  //     name: 'transaction_contract_address_function_index',
  //     columns: [
  //       'contract_address', 'function'
  //     ]
  //   },
  //   {
  //     name: 'transaction_contract_address_index',
  //     columns: [
  //       'contract_address'
  //     ]
  //   }
  // ]
})

export const InputEntity = new EntitySchema<FunctionInput & {id: number, transaction: OrganizedTransaction, /*transactionTransactionHash: string*/}>({
  name: "input",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    name: {
      type: String,
      // primary: true
    },
    type: {
      type: String,
      nullable: true
    },
    value: {
      type: "jsonb",
      nullable: true
    },
    // transactionTransactionHash: {
    //   type: String,
    // }
    // transactionHash: {
    //   primary: true
    // }
  },
  relations: {
    transaction: {
      type: "many-to-one",
      target: "transaction",
      joinColumn: true,
      inverseSide: 'inputs',
    }
  },
  // indices: [
  //   {
  //     name: 'input_transactionTransactionHash_index',
  //     columns: [
  //       'transactionTransactionHash'
  //     ]
  //   }
  // ]
})

export const EventEntity = new EntitySchema<OrganizedEvent & {id: number, transaction: OrganizedTransaction, /*transactionTransactionHash: string*/}>({
  name: "event",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    name: {
      type: String,
      // primary: true
    },
    transmitter_contract: {
      type: String,
      // primary: true
    },
    // transactionTransactionHash: {
    //   type: String,
    // }
    // transactionHash: {
    //   primary: true,
    //   type: String
    // }
  },
  relations: {
    transaction: {
      type: "many-to-one",
      target: "transaction",
      joinColumn: true,
      inverseSide: 'events',
    },
    arguments: {
      type: "one-to-many",
      target: "argument",
      inverseSide: 'event',
      cascade: true
    }
  },
  // indices: [
  //   {
  //     name: 'event_transactionTransactionHash_index',
  //     columns: [
  //       'transactionTransactionHash'
  //     ]
  //   },
  //   {
  //     name: 'event_name_transmitter_contract_index',
  //     columns: [
  //       'name', 'transmitter_contract'
  //     ]
  //   },
  //   {
  //     name: 'event_transmitter_contract_index',
  //     columns: [
  //       'transmitter_contract'
  //     ]
  //   }
  // ]
})

export const ArgumentEntity = new EntitySchema<EventArgument & {id: number, event: OrganizedEvent, /*eventId: number*/}>({
  name: "argument",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    name: {
      type: String,
      // primary: true
    },
    type: {
      type: String,
      nullable: true
    },
    value: {
      type: "jsonb",
      nullable: true
    },
    // eventId: {
    //   type: Number
    // }
    // eventTransactionHash: {
    //   primary: true,
    //   type: String
    // },
    // eventTransmitterContract: {
    //   primary: true,
    //   type: String
    // },
    // eventName: {
    //   primary: true,
    //   type: String
    // }
  },
  relations: {
    event: {
      type: "many-to-one",
      target: "event",
      joinColumn: true,
      inverseSide: 'arguments',
    }
  },
  // indices: [
  //   {
  //     name: 'argument_eventId_index',
  //     columns: [
  //       'eventId'
  //     ]
  //   }
  // ]
})

export interface RawBlock {
  block_number: number
  raw: any
}

export const RawBlockEntity = new EntitySchema<RawBlock>({
  name: "raw_block",
  columns: {
    block_number: {
      type: Number,
      primary: true
    },
    raw: {
      type: 'jsonb'
    }
  }
})

export interface RawAbi {
  block_number: number
  contract_address: string
  raw: any
}

export const RawAbiEntity = new EntitySchema<RawAbi>({
  name: "raw_abi",
  columns: {
    block_number: {
      type: Number,
      primary: true
    },
    contract_address: {
      type: String,
      primary: true
    },
    raw: {
      type: 'jsonb'
    }
  }
})