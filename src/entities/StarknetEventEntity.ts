import {formatId} from "../util/format"
import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm'
import { AbstractWarthogModel } from './AbstractWarthogModel'
import {OrganizedEvent} from "starknet-analyzer/src/types/organizedStarknet";
import {StarknetTransactionReceiptEntity} from "./StarknetTransactionReceiptEntity";
import {Transaction} from "../starknet/data";
import {StarknetBlockEntity} from "./StarknetBlockEntity";

export const STARKNET_EVENT_TABLE_NAME = 'starknet_event';

/**
 * TypeORM Entity class representing Starknet event persistent data
 */
@Entity({
  name: STARKNET_EVENT_TABLE_NAME,
})
export class StarknetEventEntity
  extends AbstractWarthogModel
  implements OrganizedEvent
{
  @PrimaryColumn()
  id!: string;

  @Column()
  @Index()
  name!: string;

  @Column()
  @Index()
  transmitterContract!: string;

  @Column({ type: 'jsonb' })
  calldata!: any[];

  @ManyToOne(() => StarknetTransactionReceiptEntity)
  @JoinColumn({name: 'transaction_id', referencedColumnName: 'id'})
  receipt!: StarknetTransactionReceiptEntity;

  static fromApiData(blockEntity: StarknetBlockEntity, indexInBlock: number, receiptEntity: StarknetTransactionReceiptEntity, organizedEvent: OrganizedEvent): StarknetEventEntity {
    const entity = new StarknetEventEntity();

    entity.name = organizedEvent.name;
    entity.transmitterContract = organizedEvent.transmitterContract;
    entity.calldata = organizedEvent.calldata;

    entity.id = formatId({ height: blockEntity.height, index: indexInBlock, hash: blockEntity.hash })
      + '-' + organizedEvent.transmitterContract + '-' + organizedEvent.name;

    entity.receipt = receiptEntity;

    return entity
  }
}