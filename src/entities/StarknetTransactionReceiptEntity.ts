import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm'
import {formatId} from "../util/format"
import {AbstractWarthogModel} from './AbstractWarthogModel'
import {StarknetBlockEntity} from './StarknetBlockEntity'
import {ConsumedMessage, ExecutionResources, StarknetEvent, StarknetTransactionReceipt} from "../starknet/data";
// import {TransactionReceipt} from 'starknet/types'
// import {TransactionReceipt} from '../starknet/data'
import {TransactionReceipt} from 'starknet-analyzer/src/types/rawStarknet'

export const STARKNET_TRANSACTION_RECEIPT_TABLE_NAME = 'starknet_transaction_receipt';

/**
 * TypeORM Entity class representing Starknet transaction receipt persistent data
 */
@Entity({
  name: STARKNET_TRANSACTION_RECEIPT_TABLE_NAME,
})
export class StarknetTransactionReceiptEntity
  extends AbstractWarthogModel
  implements StarknetTransactionReceipt {
  @PrimaryColumn()
  id!: string;

  @Column()
  @Index()
  name!: string;

  //TODO add ! and ?

  @Column()
  transactionHash!: string;

  @Column({nullable: true})
  transactionIndex!: number;

  @Column({nullable: true})
  actualFee!: string;

  @Column({type: 'jsonb', nullable: true})
  executionResources!: ExecutionResources;

  @Column({type: 'jsonb', nullable: true})
  events!: StarknetEvent[];

  @Column({type: 'jsonb'})
  l2l1Messages!: string[];

  @Column({type: 'jsonb', nullable: true})
  l1l2ConsumedMessage?: ConsumedMessage;

  @ManyToOne(() => StarknetBlockEntity)
  @JoinColumn({name: 'block_id', referencedColumnName: 'id'})
  block!: StarknetBlockEntity;

  //TODO inspect more fields for TransactionReceipt in starknet.js
/*  export declare type TransactionReceipt = {
  status: Status;
  transaction_hash: string;
  transaction_index: number;
  block_hash: string;
  block_number: BlockNumber;
  l2_to_l1_messages: string[];
  events: string[];
};
};*/

  //TODO starknet.js missing TransactionReceipt.actual_fee field have to use type any

  static fromApiData(blockEntity: StarknetBlockEntity, t: TransactionReceipt): StarknetTransactionReceiptEntity {
    const entity = new StarknetTransactionReceiptEntity();

    entity.id = formatId({
      height: blockEntity.height,
      index: t.transaction_index,
      hash: blockEntity.hash,
    });
    entity.block = blockEntity;

    entity.name = t.transaction_hash;
    entity.transactionHash = t.transaction_hash;
    //TODO TransactionReceipt missing actual_fee
    // entity.actualFee = t.actual_fee;
    entity.transactionIndex = t.transaction_index;

    // entity.executionResources = t.execution_resources;
    //TODO normalize events and messages into separate entities and tables?
    // entity.events = t.events;
    entity.l2l1Messages = t.l2_to_l1_messages;
    // entity.l1l2ConsumedMessage = t.l1_to_l2_consumed_message;

    return entity
  }
}
