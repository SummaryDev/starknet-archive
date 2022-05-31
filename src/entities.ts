import {ColumnType, EntitySchema} from 'typeorm';
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
    previous_block_hash: {
      type: String,
      nullable: true
    },
    state_root: {
      type: String
    },
    timestamp: {
      type: String
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

export const TransactionEntity = new EntitySchema<OrganizedTransaction & {block: OrganizedBlock}>({
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
  }
})

export const InputEntity = new EntitySchema<FunctionInput & {id: number, transaction: OrganizedTransaction}>({
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
  }
})

export const EventEntity = new EntitySchema<OrganizedEvent & {id: number, transaction: OrganizedTransaction}>({
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
  }
})

export const ArgumentEntity = new EntitySchema<EventArgument & {id: number, event: OrganizedEvent}>({
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
  }
})