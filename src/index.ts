import 'dotenv/config'
import {createConnection, getConnectionOptions, DataSource} from "typeorm"
import {defaultProvider} from 'starknet'
import {GetBlockResponse} from 'starknet-parser/src/types/rawStarknet'
import { OrganizedBlock } from 'starknet-parser/src/types/organizedStarknet'
import { BlockOrganizer } from 'starknet-parser/lib/organizers/BlockOrganizer'
import * as console from 'starknet-parser/lib/helpers/console'
import {BlockEntity} from './entities'

function main() {
  getConnectionOptions().then(connectionOptions => {
    createConnection(connectionOptions).then(async ds => {
      console.info(ds.options)
      await processBlocks(ds)
    }).catch(err => console.error('cannot getConnection', err))
  }).catch(err => console.error('cannot getConnectionOptions', err))
}

main()

async function processBlocks(ds: DataSource) {
  const blockRepository = ds.getRepository<OrganizedBlock>(BlockEntity);

  const startBlock = Number.parseInt(process.env.START_BLOCK!)
  const finishBlock = Number.parseInt(process.env.FINISH_BLOCK!)

  console.info(`processing blocks ${startBlock} to ${finishBlock}`)

  const blockOrganizer = new BlockOrganizer(defaultProvider);

  for (let blockNumber = startBlock; blockNumber <= finishBlock; ) {
    console.info(`processing ${blockNumber}`)

    let organizedBlock: OrganizedBlock

    try {
      const getBlockResponse = await defaultProvider.getBlock(blockNumber) as any
      const block = getBlockResponse as GetBlockResponse
      organizedBlock = await blockOrganizer.organizeBlock(block)
    } catch (err) {
      console.error(`cannot getBlock ${blockNumber}, retrying`, err)
      await sleep()
      continue
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

async function sleep() {
  return new Promise(resolve => setTimeout(resolve, Number.parseInt(process.env.RETRY_TIMEOUT || '1000')));
}
