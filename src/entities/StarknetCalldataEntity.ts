import {formatId} from "../util/format"
import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm'
import { AbstractWarthogModel } from './AbstractWarthogModel'
import {FunctionInput, OrganizedCalldata} from "starknet-parser/src/types/organizedStarknet";
import {StarknetTransactionReceiptEntity} from "./StarknetTransactionReceiptEntity";
import {Transaction} from "../starknet/data";
import {StarknetBlockEntity} from "./StarknetBlockEntity";
import {StarknetTransactionEntity} from "./StarknetTransactionEntity";

export const STARKNET_CALLDATA_TABLE_NAME = 'starknet_calldata';

/**
 * TypeORM Entity class representing Starknet calldata persistent data
 */
@Entity({
  name: STARKNET_CALLDATA_TABLE_NAME,
})
export class StarknetCalldataEntity
  extends AbstractWarthogModel
  implements FunctionInput
{
  @PrimaryColumn()
  id!: string;

  @Column()
  @Index()
  name!: string;

  @Column({nullable: true})
  type!: string;

  @Column({ type: 'jsonb' })
  value!: any;

  @ManyToOne(() => StarknetTransactionEntity)
  @JoinColumn({name: 'transaction_id', referencedColumnName: 'id'})
  transaction!: StarknetTransactionEntity;

  static fromApiData(blockEntity: StarknetBlockEntity, indexInBlock: number, transactionEntity: StarknetTransactionEntity, functionInput: FunctionInput): StarknetCalldataEntity {
    const entity = new StarknetCalldataEntity();

    entity.name = functionInput.name;
    entity.type = functionInput.type;
    entity.value = functionInput.value;

    entity.id = formatId({ height: blockEntity.height, index: indexInBlock, hash: blockEntity.hash })
      + '-' + transactionEntity.contractAddress + '-' + functionInput.name;

    entity.transaction = transactionEntity;

    return entity
  }
}