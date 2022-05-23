import _ from 'lodash'
import Debug from 'debug'
import { PooledExecutor } from './PooledExecutor'
import { IStatusService } from '../status-service/IStatusService'
import { getConnection, EntityManager } from 'typeorm'
import { getConfig } from '../node'
import { BlockProducer } from '.'
import { getStatusService } from '../status-service'
import { eventEmitter, IndexerEvents } from '../node/event-emitter'
import {StarknetBlockEntity, StarknetTransactionEntity, StarknetTransactionReceiptEntity} from '../entities'
//import {GetBlockResponse, Transaction, TransactionReceipt} from 'starknet/types'
import {GetBlockResponse, StarknetBlockInfo} from '../starknet/data'
import {defaultProvider} from 'starknet'
import { BlockOrganizer } from 'starknet-analyzer/lib/organizers/BlockOrganizer'
import {StarknetEventEntity} from '../entities'
import {StarknetCalldataEntity} from '../entities'
import {TransactionReceipt} from 'starknet-analyzer/src/types/rawStarknet'

const debug = Debug('index-builder:indexer');

/**
 *  This class is responsible for fetching blocks from the `BlockProducer` and saving them into the database.
 *  Internally, it creates an intance of `PooledExecutor` to asyncronously process blocks using multiple workers.
 */
export class IndexBuilder {
  private _stopped = false;
  private producer!: BlockProducer;
  private statusService!: IStatusService;
  private blockOrganizer!: BlockOrganizer;

  async start(): Promise<void> {
    debug(`Starting Index Builder`);

    this.producer = new BlockProducer();
    this.statusService = await getStatusService();

    this.blockOrganizer = new BlockOrganizer(defaultProvider);

    debug('Spawned worker.');

    const lastHead = await this.statusService.getIndexerHead();

    debug(`Last indexed block in the database: ${lastHead.toString()}`);
    let startBlock = lastHead + 1;

    const atBlock = getConfig().BLOCK_HEIGHT;

    if (lastHead >= 0 && !getConfig().FORCE_HEIGHT) {
      debug(
        `WARNING! The database contains indexed blocks.
          The last indexed block height is ${lastHead}. The indexer
          will continue from block ${lastHead} ignoring the start
          block height hint. Set the environment variable FORCE_BLOCK_HEIGHT to true
          if you want to start from ${atBlock} anyway.`
      )
    } else {
      startBlock = Math.max(startBlock, atBlock)
    }

    debug(`Starting the block indexer at block ${startBlock}`);

    await this.producer.start(startBlock);

    const poolExecutor = new PooledExecutor(
      getConfig().WORKERS_NUMBER,
      this.producer.blockHeights(),
      this._indexBlock()
    );

    debug('Started a pool of indexers.');
    eventEmitter.on(IndexerEvents.INDEXER_STOP, async () => await this.stop());

    try {
      await poolExecutor.run(() => this._stopped)
    } finally {
      await this.stop()
    }
  }

  async stop(): Promise<void> {
    debug('Index builder has been stopped');
    this._stopped = true;
    await this.producer.stop()
  }

  private _indexBlock(): (h: number) => Promise<void> {
    return async (h: number) => {
      debug(`Processing block #${h.toString()}`);

      const done = await this.statusService.isComplete(h);
      if (done) {
        debug(`Block ${h} has already been indexed`);
        return
      }

      eventEmitter.emit(IndexerEvents.BLOCK_STARTED, {
        height: h,
      });

      const block = await this.producer.fetchBlock(h);

      await this.transformAndPersist(block);

      debug(`Done block #${h.toString()}`)
    }
  }

  /**
   * Extracts transactions, transaction receipts and block info from `BlockData` and
   * creates the corresponding entities to be persisted.
   *
   * @param block - raw block data to be saved into the DB
   */
  async transformAndPersist(block: GetBlockResponse): Promise<void> {
    const blockEntity = StarknetBlockEntity.fromApiData(block);

    await getConnection().transaction(async (em: EntityManager) => {
      debug(`Saving block data`);
      await em.save(blockEntity);
      debug(`Saved block data`);

      debug(`Saving transactions`);

      // const transactionEntities = block.transactions.map((o, i) => {
      //   return StarknetTransactionEntity.fromApiData(blockEntity, i, o);
      // });
      //
      // await em.save(transactionEntities);
      //
      // debug(`Saved ${transactionEntities.length} transactionEntities`);

      for(let i=0; i < block.transactions.length; i++) {
        const transaction = block.transactions[i];

        //TODO add DEPLOY transactions
        if (transaction.type !== "INVOKE_FUNCTION") continue;

        const transactionEntity = StarknetTransactionEntity.fromApiData(blockEntity, i, transaction);

        debug(`Saving transactionEntity ${JSON.stringify(transactionEntity)}`);
        await em.save(transactionEntity);
        debug(`Saved transactionEntity`);

        const organizedFunction = await this.blockOrganizer.getFunction(transaction);

        for (let j = 0; j < organizedFunction.inputs.length; j++) {
          const calldata = organizedFunction.inputs[j];
          const calldataEntity = StarknetCalldataEntity.fromApiData(blockEntity, i, transactionEntity, calldata);
          debug(`Saving calldataEntity ${JSON.stringify(calldataEntity)}`);
          await em.save(calldataEntity);
          debug(`Saved calldataEntity`);
        }
      }

      debug(`Saving transaction receipts`);

      // const transactionReceiptEntities = block.transaction_receipts.map((o, i) => {
      //   return StarknetTransactionReceiptEntity.fromApiData(blockEntity, i, o);
      // });
      //
      // await em.save(transactionReceiptEntities);
      //
      // debug(`Saved ${transactionReceiptEntities.length} transactionReceiptEntities`);

      for(let i=0; i < block.transaction_receipts.length; i++) {
        const receiptApi = block.transaction_receipts[i] as any;
        const receipt = receiptApi as TransactionReceipt;
        const receiptEntity = StarknetTransactionReceiptEntity.fromApiData(blockEntity, receipt);

        debug(`Saving receiptEntity ${JSON.stringify(receiptEntity)}`);
        await em.save(receiptEntity);
        debug(`Saved receiptEntity`);

        const organizedEvents = await this.blockOrganizer.getEvents(receipt);

        for (let j = 0; j < organizedEvents.length; j++) {
          const event = organizedEvents[j];
          const eventEntity = StarknetEventEntity.fromApiData(blockEntity, receipt.transaction_index, receiptEntity, event);
          debug(`Saving eventEntity ${JSON.stringify(eventEntity)}`);
          await em.save(eventEntity);
          debug(`Saved eventEntity`);
        }
      }


      //TODO try saving in batches

      const blockInfo = new StarknetBlockInfo(blockEntity);

      eventEmitter.emit(IndexerEvents.BLOCK_COMPLETED, blockInfo);
    });
  }
}
