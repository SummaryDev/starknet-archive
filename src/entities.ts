import {EntitySchema, ValueTransformer} from 'typeorm'
import {OrganizedBlock, OrganizedTransaction, OrganizedEvent, FunctionInput, EventArgument} from "starknet-parser/src/types/organizedStarknet"

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
    previous_block_hash: {
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

export const TransactionEntity = new EntitySchema<OrganizedTransaction & {block: OrganizedBlock, blockBlockNumber: number}>({
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
      type: String
    },
    entry_point_type: {
      type: String,
      nullable: true
    },
    max_fee: {
      type: String,
      nullable: true
    },
    function: {
      type: String,
      nullable: true
    },
    blockBlockNumber: {
      type: Number
    },
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
  indices: [
    {
      name: 'transaction_blockBlockNumber_index',
      columns: [
        'blockBlockNumber'
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

export const InputEntity = new EntitySchema<FunctionInput & {id: number, transaction: OrganizedTransaction, transactionTransactionHash: string}>({
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
    transactionTransactionHash: {
      type: String,
      nullable: true
    }
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
  indices: [
    {
      name: 'input_transactionTransactionHash_index',
      columns: [
        'transactionTransactionHash'
      ]
    }
  ]
})

export const EventEntity = new EntitySchema<OrganizedEvent & {id: number, transaction: OrganizedTransaction, transactionTransactionHash: string}>({
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
    transactionTransactionHash: {
      type: String,
      nullable: true
    }
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
  indices: [
    {
      name: 'event_transactionTransactionHash_index',
      columns: [
        'transactionTransactionHash'
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

export const numeric: ValueTransformer = {
  to: (entityValue: number) => entityValue.toString(),
  from: (databaseValue: string): number => parseInt(databaseValue, 10)
}

export const ArgumentEntity = new EntitySchema<EventArgument & {id: number, event: OrganizedEvent, eventId: number, decimal: Number}>({
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
      type: 'numeric',
      precision: 78,
      nullable: true,
      transformer: numeric
    },
    eventId: {
      type: Number
    }
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
  indices: [
    {
      name: 'argument_eventId_index',
      columns: [
        'eventId'
      ]
    }
  ]
})