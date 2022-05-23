import {formatId} from "../util/format"
import {
  TransactionInfo,
  TransactionReceiptInfo,
  StarknetBlock,
} from '../starknet/data'
import { Column, Entity, Index, PrimaryColumn } from 'typeorm'
import { AbstractWarthogModel } from './AbstractWarthogModel'
//import {GetBlockResponse} from 'starknet/types'
import {GetBlockResponse} from '../starknet/data'

export const STARKNET_BLOCK_TABLE_NAME = 'starknet_block';

/**
 * TypeORM Entity class representing Starknet block persistent data
 */
@Entity({
  name: STARKNET_BLOCK_TABLE_NAME,
})
export class StarknetBlockEntity
  extends AbstractWarthogModel
  implements StarknetBlock
{
  @PrimaryColumn()
  id!: string;

  @Column()
  @Index()
  height!: number;

  @Column('bigint')
  timestamp!: number;

  @Column()
  @Index()
  hash!: string;

  // TODO only the first block has nullable parent hash
  @Column({nullable: true})
  @Index()
  parentHash!: string;

  @Column()
  stateRoot!: string;

  @Column()
  gasPrice!: string;

  @Column()
  @Column({nullable: true})
  sequencerAddress!: string;

  @Column()
  status!: string;

  @Column({ type: 'jsonb' })
  transactions!: TransactionInfo[];

  @Column({ type: 'jsonb' })
  transactionReceipts!: TransactionReceiptInfo[];

  static fromApiData(b: GetBlockResponse): StarknetBlockEntity {
    const entity = new StarknetBlockEntity();

    entity.height = b.block_number;
    entity.timestamp = b.timestamp;
    entity.hash = b.block_hash;
    entity.parentHash = b.previous_block_hash;
    entity.stateRoot = b.state_root;
    entity.status = b.status;
    //TODO gas_price and sequencer_address are present in the API output but not in the starknet.js type GetBlockResponse
    entity.gasPrice = b.gas_price;
    entity.sequencerAddress = b.sequencer_address;

    entity.id = formatId({ height: entity.height, hash: entity.hash });

    //TODO transactions in the API is an array not a map as declared in starknet.js
    entity.transactions = b.transactions.map((o: any, index: number) => {
      return {
        id: formatId({ height: entity.height, index, hash: entity.hash }),
        name: o.transaction_hash
      }
    });

    //TODO transaction_receipts in the API is an array not a map as declared in starknet.js
    entity.transactionReceipts = b.transaction_receipts.map((o: any, index: number) => {
      return {
        id: formatId({ height: entity.height, index, hash: entity.hash }),
        name: o.transaction_hash
      }
    });

    return entity
  }
}