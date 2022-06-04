import 'dotenv/config'
import {createConnection, getConnectionOptions, DataSource} from "typeorm"
import {defaultProvider} from 'starknet'
import { OrganizedBlock } from 'starknet-parser/src/types/organizedStarknet'
import { BlockOrganizer } from 'starknet-parser/lib/organizers/BlockOrganizer'
import * as console from 'starknet-parser/lib/helpers/console'
import {sleep} from 'starknet-parser/lib/helpers/helpers'
import {BlockEntity} from './entities'
import {OnlineBlockProvider, DatabaseAbiProvider, DatabaseBlockProvider} from "./providers"

function main() {
  return getConnectionOptions().then(connectionOptions => {
    return createConnection(connectionOptions).then(async ds => {
      console.info(ds.options)
      return processBlocks(ds).then(() => {
        console.info('done processBlocks')
      }).catch(err => console.error('cannot processBlocks', err))
    }).catch(err => console.error('cannot getConnection', err))
  }).catch(err => console.error('cannot getConnectionOptions', err))
}

main()

async function processBlocks(ds: DataSource) {
  const blockRepository = ds.getRepository<OrganizedBlock>(BlockEntity)

  const startBlock = Number.parseInt(process.env.START_BLOCK || '0')
  const finishBlock = Number.parseInt(process.env.FINISH_BLOCK || '0')
  const retryWait = Number.parseInt(process.env.RETRY_WAIT || '1000')

  console.info(`processing blocks ${startBlock} to ${finishBlock}`)

  const blockProvider = new DatabaseBlockProvider(defaultProvider, ds) //OnlineBlockProvider(defaultProvider)
  const abiProvider = new DatabaseAbiProvider(defaultProvider, ds) //OnlineAbiProvider(defaultProvider)

  const blockOrganizer = new BlockOrganizer(abiProvider)

  for (let blockNumber = startBlock; blockNumber <= finishBlock; ) {
    console.info(`processing ${blockNumber}`)

    let organizedBlock: OrganizedBlock

    try {
      const block = await blockProvider.get(blockNumber) as any
      organizedBlock = await blockOrganizer.organizeBlock(block)
    } catch(err) {
      let message = 'Unknown Error'
      if (err instanceof Error) message = err.message
      if (message.includes('Request failed with status code'))  {
        console.error(`cannot getBlock ${blockNumber}, retrying ${message}`/*, err*/)
        await sleep(retryWait)
        continue
      } else {
        console.error(`cannot getBlock ${blockNumber}, exiting ${err}`, err)
        return
      }
    }

    try {
      await blockRepository.save(organizedBlock)
      console.info(`saved ${blockNumber}`)
    } catch (err) {
      console.error(`cannot save ${blockNumber}`, err)
      return
    }

    blockNumber++
  } // thru blockNumber range

}

