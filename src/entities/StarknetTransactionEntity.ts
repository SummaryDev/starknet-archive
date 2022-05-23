import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm'
import {formatId} from "../util/format"
import {AbstractWarthogModel} from './AbstractWarthogModel'
import {StarknetBlockEntity} from './StarknetBlockEntity'
import {StarknetTransaction} from "../starknet/data"
// import {Transaction} from 'starknet/types'
import {Transaction} from '../starknet/data'

export const STARKNET_TRANSACTION_TABLE_NAME = 'starknet_transaction';

/**
 * TypeORM Entity class representing Starknet transaction persistent data
 */
@Entity({
  name: STARKNET_TRANSACTION_TABLE_NAME,
})
export class StarknetTransactionEntity
  extends AbstractWarthogModel
  implements StarknetTransaction {
  @PrimaryColumn()
  id!: string;

  @Column()
  @Index()
  name!: string;

  //TODO add ! and ?

  //TODO add index? @Index()
  @Column()
  @Index()
  contractAddress!: string;

  @Column({nullable: true})
  @Index()
  entryPointSelector!: string;

  @Column({nullable: true})
  entryPointType!: string;

  @Column({nullable: true})
  maxFee!: string;

  @Column()
  @Index()
  transactionHash!: string;

  @Column()
  type!: string;

  @Column({type: 'jsonb', nullable: true})
  signature!: string[];

  @Column({type: 'jsonb', nullable: true})
  calldata!: string[];

  @ManyToOne(() => StarknetBlockEntity)
  @JoinColumn({name: 'block_id', referencedColumnName: 'id'})
  block!: StarknetBlockEntity;

  //TODO inspect more fields for DeployTransaction and InvokeFunctionTransaction in starknet.js
/*  export declare type DeployTransaction = {
    type: 'DEPLOY';
  contract_definition: CompressedCompiledContract;
  contract_address_salt: BigNumberish;
  constructor_calldata: string[];
  nonce?: BigNumberish;
};
export declare type InvokeFunctionTransaction = {
  type: 'INVOKE_FUNCTION';
  contract_address: string;
  signature?: Signature;
  entry_point_type?: EntryPointType;
  entry_point_selector: string;
  calldata?: RawCalldata;
  nonce?: BigNumberish;
  max_fee?: BigNumberish;
  version?: BigNumberish;
};*/

  //TODO transactions in the API is an array not a map as declared in starknet.js, thus missing Transaction.hash field have to use type any

  static fromApiData(blockEntity: StarknetBlockEntity, indexInBlock: number, t: Transaction): StarknetTransactionEntity {
    const entity = new StarknetTransactionEntity();

    entity.id = formatId({
      height: blockEntity.height,
      index: indexInBlock,
      hash: blockEntity.hash,
    });
    entity.block = blockEntity;

    //TODO perhaps function name decoded from abi entryPointSelector is not the best name
    // entity.name = t.transaction_hash;
    entity.transactionHash = t.transaction_hash;
    entity.contractAddress = t.contract_address;
    entity.entryPointSelector = t.entry_point_selector;
    entity.entryPointType = t.entry_point_type;
    entity.maxFee = t.max_fee;
    entity.type = t.type;

    entity.signature = t.signature;
    //TODO normalize calldata into a separate entity and table?
    entity.calldata = t.calldata;

    return entity
  }
}
