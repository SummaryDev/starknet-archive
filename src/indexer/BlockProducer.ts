import Debug from 'debug'
import pRetry from 'p-retry'
import pTimeout, {TimeoutError} from 'p-timeout'
import pWaitFor from 'p-wait-for'
import {getConfig} from '../node'
import {eventEmitter, IndexerEvents} from '../node/event-emitter'
import {FIFOCache} from "../util/FIFOCache"
import {IBlockProducer} from './IBlockProducer'
import {GetBlockResponse} from '../starknet/data'
import {defaultProvider} from 'starknet'

const debug = Debug('starknet-indexer:producer');

export class BlockProducer implements IBlockProducer<GetBlockResponse> {
  private _started: boolean;

  private _blockToProduceNext: number;

  private _chainHeight: number;

  private _headerCache = new FIFOCache<number, GetBlockResponse>(
    getConfig().HEADER_CACHE_CAPACITY
  );

  constructor() {
    debug(`Creating Block Producer`);
    this._started = false;
    this._blockToProduceNext = 0;
    this._chainHeight = 0;
  }

  async start(atBlock: number): Promise<void> {
    debug(`Starting Block Producer`);
    if (this._started) throw Error(`Cannot start when already started.`);

    // mark as started
    this._started = true;

    // Try to get initial header right away
    const topBlock = await defaultProvider.getBlock();

    this._chainHeight = topBlock.block_number;

    // We cache block headers to save on API calls
    eventEmitter.on(IndexerEvents.NEW_FINALIZED_HEAD, ({header, height}) => {
      debug(`New finalized head: ${JSON.stringify(header)}, height: ${height}`);
      this._headerCache.put(height, header);
      this._chainHeight = header.block_number;
    });

    this._blockToProduceNext = atBlock;
    debug(
      `Starting the block producer, next block: ${this._blockToProduceNext.toString()}`
    );
    if (atBlock > this._chainHeight) {
      debug(
        `Current finalized head ${this._chainHeight} is behind the start block ${atBlock}. Waiting...`
      );
      await pWaitFor(() => this._chainHeight >= atBlock)
    }
  }

  async stop(): Promise<void> {
    if (!this._started) {
      debug('Block producer is not started');
      return
    }

    debug('Block producer has been stopped');
    this._started = false
  }

  public async fetchBlock(height: number): Promise<GetBlockResponse> {
    if (height > this._chainHeight) {
      throw new Error(
        `Cannot fetch block at height ${height}, current chain height is ${this._chainHeight}`
      )
    }
    debug(`Fetching block #${height.toString()}`);

    // retry if the there was an error for some reason
    return pRetry(() => this._doBlockProduce(height), {
      retries: getConfig().BLOCK_PRODUCER_FETCH_RETRIES,
    })
  }

  public async* blockHeights(): AsyncGenerator<number> {
    while (this._started) {
      await this.checkHeightOrWait();
      debug(`Yield: ${this._blockToProduceNext.toString()}`);
      yield this._blockToProduceNext;
      this._blockToProduceNext++
    }
  }

  /**
   * This sub-routine does the actual fetching and block processing.
   * It can throw errors which should be handled by the top-level code
   */
  private async _doBlockProduce(height: number): Promise<GetBlockResponse> {
    debug(`\tBlock height ${height.toString()}.`);


    const blockData = await defaultProvider.getBlock(height);

    if (getConfig().VERBOSE) {
      debug(`Received block data: ${JSON.stringify(blockData, null, 2)}`)
    }
    debug(`Produced query event block.`);

    return blockData as GetBlockResponse
  }

  private async checkHeightOrWait(): Promise<void> {
    return pTimeout(
      pWaitFor(
        // when to resolve
        () => this._blockToProduceNext <= this._chainHeight
      ),
      getConfig().NEW_BLOCK_TIMEOUT_MS,
      new TimeoutError(
        `Timed out: no block has been produced within last ${
          getConfig().NEW_BLOCK_TIMEOUT_MS
          } seconds`
      )
    )
  }

  //TODO use apiCall with retries
  /*private async apiCall<T>(
    promiseFn: (api: ApiPromise) => Promise<T>,
    functionName = 'api request'
  ): Promise<T> {
    return pRetry(
      async () => {
        if (this.shouldStop) {
          throw new pRetry.AbortError(
            'The indexer is stopping, aborting all API calls'
          )
        }
        const api = await getApiPromise();
        return promiseFn(api)
      },
      {
        retries: getConfig().STARKNET_API_CALL_RETRIES,
        onFailedAttempt: (i) =>
          debug(
            `Failed to execute "${functionName}" after ${i.attemptNumber} attempts. Retries left: ${i.retriesLeft}`
          ),
      }
    )
  }*/

}
