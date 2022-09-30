import 'dotenv/config'
import {createConnection, getConnectionOptions, DataSource, Repository} from "typeorm"
import * as console from './helpers/console'
import {sleep} from './helpers/helpers'
import {ComboApi} from "./api/combo";
import {BlockOrganizer} from "./organizers/block";
import {ApiError} from "./helpers/error";
import {DatabaseApi} from "./api/database";
import {Api} from "./api/interfaces";
import {OrganizedBlock} from "./types/organized-starknet";
import {BlockEntity} from "./entities";
import {Block} from "./types/raw-starknet";

function main() {
  (async () => {
    const connectionOptions = await getConnectionOptions()
    const ds = await createConnection(connectionOptions)
    const optionsInfo = connectionOptions as any
    delete optionsInfo.password
    console.info(optionsInfo)
    await iterateBlocks(ds)
  })()
}

main()

async function iterateBlocks(ds: DataSource) {

  const blockRepository = ds.getRepository<Block>(BlockEntity)

  const q = await blockRepository.createQueryBuilder().select('max(block_number)', 'max')
  const r = await q.getRawOne()
  const nextBlock = r ? r.max + 1 : 0

  const startBlock = typeof process.env.STARKNET_ARCHIVE_START_BLOCK !== 'undefined' ? Number.parseInt(process.env.STARKNET_ARCHIVE_START_BLOCK!) : nextBlock
  const finishBlock = typeof process.env.STARKNET_ARCHIVE_FINISH_BLOCK !== 'undefined' ? Number.parseInt(process.env.STARKNET_ARCHIVE_FINISH_BLOCK!) : Number.MAX_VALUE

  const retryWait = Number.parseInt(process.env.STARKNET_ARCHIVE_RETRY_WAIT || '1000')

  const pathfinderUrl = process.env.STARKNET_ARCHIVE_PATHFINDER_URL || 'https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a' /*'http://54.80.141.84:9545'*/
  const network = process.env.STARKNET_ARCHIVE_NETWORK || 'goerli-alpha'

  const api = new ComboApi(pathfinderUrl, network)

  const p = new OrganizeBlockProcessor(api, ds)

  console.info(`processing blocks ${startBlock} to ${finishBlock} from ${network} and ${pathfinderUrl}`)

  for (let blockNumber = startBlock; blockNumber <= finishBlock; ) {
    console.info(`processing ${blockNumber}`)

    try {
      if (await p.process(blockNumber)) {
        blockNumber++
      } else {
        await sleep(retryWait)
      }
    } catch(err) {
      console.error(`cannot process ${blockNumber}, exiting for ${err}`, err)
      return
    }
  } // thru blockNumber range

}

function canRetry(err: any): boolean {
  const ret = err instanceof ApiError // communication failures
    || (err instanceof Error && err.message !== undefined && err.message !== null && (err.message.includes('ECONNRESET') || err.message.includes('EAI_AGAIN') || err.message.includes('ENOTFOUND') || err.message.includes('StarkErrorCode.MALFORMED_REQUEST') //TODO these must be coming from starknet.js and thus are not ApiError
        || err.message.includes('BLOCK_NOT_FOUND') // feeder api: block is not there yet
        || err.message.includes('Invalid block') // pathfinder api code 24: block is not there yet //TODO when start sourcing everything from pathfinder such gap where we got the block already but cannot call other api methods at this block should not be possible and should be treated as unrecoverable error
        || err.message.includes('Block missing')) // pathfinder api code -32603: starknet_getTransactionReceipt Internal error: Block missing from database
    )
  if(ret)
    console.info(`retrying for ${err}`/*, err*/)
  else
    console.info(`cannot retry for ${err}`/*, err*/)
  return ret
}

export class OrganizeBlockProcessor {
  private readonly blockRepository: Repository<OrganizedBlock>
  private readonly blockOrganizer: BlockOrganizer
  private readonly databaseApi: DatabaseApi

  constructor(api: Api, ds: DataSource) {
    this.blockRepository = ds.getRepository<OrganizedBlock>(BlockEntity)
    this.databaseApi = new DatabaseApi(api, ds)
    this.blockOrganizer = new BlockOrganizer(this.databaseApi)
  }

  async process(blockNumber: number): Promise<boolean> {
    let organizedBlock: OrganizedBlock

    try {
      const block = await this.databaseApi.getBlock(blockNumber)
      if(!block)
        return false

      organizedBlock = await this.blockOrganizer.organizeBlock(block)
      await this.blockRepository.save(organizedBlock)
      console.info(`saved organized ${blockNumber}`)

    } catch(err) {
      if (canRetry(err))
        return false

      console.error(`cannot get or organize or save ${blockNumber}, rethrowing ${err}`/*, err*/)
      throw err
    }

    return true
  }
}