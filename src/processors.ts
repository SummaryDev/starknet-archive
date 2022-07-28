import {DataSource} from "typeorm";
import { ApiProvider } from './providers/interfaces';
import { ApiError } from './helpers/error';
import * as console from "./helpers/console";

export interface BlockProcessor {
  process(blockNumber: number): Promise<boolean>
}

function canRetry(err: any): boolean {
  const ret = err instanceof ApiError // communication failures
    || (err instanceof Error && err.message !== undefined && err.message !== null && (err.message.includes('ECONNRESET') || err.message.includes('EAI_AGAIN') || err.message.includes('StarkErrorCode.MALFORMED_REQUEST') //TODO aren't these errors covered by ApiError?
        || err.message.includes('BLOCK_NOT_FOUND') // feeder api: block is not there yet
        || err.message.includes('Invalid block hash')) // pathfinder api code 24: block is not there yet //TODO when start sourcing everything from pathfinder such gap where we got the block already but cannot call other api methods at this block should not be possible and should be treated as unrecoverable error
    )
  if(ret)
    console.info(`retrying for ${err}`/*, err*/)
  else
    console.info(`cannot retry for ${err}`/*, err*/)
  return ret
}

export class OrganizeBlockProcessor implements BlockProcessor {
  private blockProvider: ApiProvider

  constructor(private readonly blockApiProvider: ApiProvider, private readonly ds: DataSource) {
    this.blockProvider = blockApiProvider
  }

  async process(blockNumber: number): Promise<boolean> {

    try {
      const block = await this.blockProvider.getBlock(blockNumber)
      if(!block)
        return false

      // const organizedBlock = await this.blockOrganizer.organizeBlock(block)
      // await this.blockRepository.save(organizedBlock)
      console.info(`saved organized ${block}`)

    } catch(err) {
      if (canRetry(err))
        return false

      console.error(`cannot get or organize or save ${blockNumber}, rethrowing ${err}`/*, err*/)
      throw err
    }

    return true
  }
}