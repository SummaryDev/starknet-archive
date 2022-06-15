import {EntitySchema, ValueTransformer} from 'typeorm';
import {OrganizedBlock, OrganizedTransaction, OrganizedEvent, FunctionInput, EventArgument} from "starknet-parser/src/types/organizedStarknet";
import {BigNumber} from "ethers";

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
      cascade: true,
      eager: true
    }
  }
})

export interface OrganizedTransactionData extends OrganizedTransaction {
  block: OrganizedBlock;
  block_number: number;
}

export const TransactionEntity = new EntitySchema<OrganizedTransactionData>({
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
    block_number: {
      type: Number
    }
  },
  relations: {
    block: {
      type: "many-to-one",
      target: "block",
      joinColumn: {name: 'block_number'},
      nullable: false,
      inverseSide: 'transactions',
    },
    inputs: {
      type: "one-to-many",
      target: "input",
      inverseSide: 'transaction',
      cascade: true,
      eager: true,
    },
    events: {
      type: "one-to-many",
      target: "event",
      inverseSide: 'transaction',
      cascade: true,
      eager: true,
    }
  },
  indices: [
    {
      name: 'transaction_block_number_index',
      columns: [
        'block_number'
      ]
    },
    {
      name: 'transaction_contract_address_function_index',
      columns: [
        'contract_address', 'function'
      ]
    },
    {
      name: 'transaction_contract_address_index',
      columns: [
        'contract_address'
      ]
    }
  ]
})

export interface FunctionInputData extends FunctionInput {
  id: number;
  transaction: OrganizedTransactionData;
  transaction_hash: string;
}

export const InputEntity = new EntitySchema<FunctionInputData>({
  name: "input",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    name: {
      type: String,
    },
    type: {
      type: String,
      nullable: true
    },
    value: {
      type: "jsonb",
      nullable: true
    },
    transaction_hash: {
      type: String
    }
  },
  relations: {
    transaction: {
      type: "many-to-one",
      target: "transaction",
      joinColumn: {name: 'transaction_hash'},
      nullable: false,
      inverseSide: 'inputs',
    }
  },
  indices: [
    {
      name: 'input_transaction_hash_index',
      columns: [
        'transaction_hash'
      ]
    }
  ]
})

export interface OrganizedEventData extends OrganizedEvent {
  id: number;
  transaction: OrganizedTransactionData;
  transaction_hash: string;
}

export const EventEntity = new EntitySchema<OrganizedEventData>({
  name: "event",
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true
    },
    name: {
      type: String,
    },
    transmitter_contract: {
      type: String,
    },
    transaction_hash: {
      type: String
    }
  },
  relations: {
    transaction: {
      type: "many-to-one",
      target: "transaction",
      joinColumn: {name: 'transaction_hash'},
      nullable: false,
      inverseSide: 'events',
    },
    arguments: {
      type: "one-to-many",
      target: "argument",
      inverseSide: 'event',
      cascade: true,
      eager: true
    }
  },
  indices: [
    {
      name: 'event_transaction_hash_index',
      columns: [
        'transaction_hash'
      ]
    },
    {
      name: 'event_name_transmitter_contract_index',
      columns: [
        'name', 'transmitter_contract'
      ]
    },
    {
      name: 'event_transmitter_contract_index',
      columns: [
        'transmitter_contract'
      ]
    }
  ]
})

export interface EventArgumentData extends EventArgument {
  id: number;
  event: OrganizedEventData;
  event_id: number;
}

export const ArgumentEntity = new EntitySchema<EventArgumentData>({
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
    decimal: {
      type: "numeric",
      precision: 78,
      scale: 0,
      nullable: true,
    },
    event_id: {
      type: Number
    }
  },
  relations: {
    event: {
      type: "many-to-one",
      target: "event",
      joinColumn: {name: 'event_id'},
      nullable: false,
      inverseSide: 'arguments',
    }
  },
  indices: [
    {
      name: 'argument_event_id_index',
      columns: [
        'event_id'
      ]
    }
  ]
})

export interface RawBlock {
  block_number: number;
  raw: any;
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
  contract_address: string;
  raw: any;
}

export const RawAbiEntity = new EntitySchema<RawAbi>({
  name: "raw_abi",
  columns: {
    contract_address: {
      type: String,
      primary: true
    },
    raw: {
      type: 'jsonb',
      nullable: true
    }
  }
})

export interface RawView {
  block_number: number;
  contract_address: string;
  view_function: string;
  raw: any;
}

export const RawViewEntity = new EntitySchema<RawView>({
  name: "raw_view",
  columns: {
    block_number: {
      type: Number,
      primary: true
    },
    contract_address: {
      type: String,
      primary: true
    },
    view_function: {
      type: String,
      primary: true
    },
    raw: {
      type: 'jsonb'
    }
  }
})