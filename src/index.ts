import 'dotenv/config'
import {createConnection, getConnectionOptions, DataSource} from "typeorm"
import {defaultProvider, Provider} from 'starknet'
import * as console from 'starknet-parser/lib/helpers/console'
import {sleep} from 'starknet-parser/lib/helpers/helpers'
import {ArchiveAbiProcessor, ArchiveBlockProcessor, BlockProcessor, OrganizeBlockProcessor} from "./processors";
import { PathfinderApiProvider } from "./providers/api/pathfinder";
import { FeederApiProvider } from "./providers/api/feeder";

function main() {
  (async () => {
    const connectionOptions = await getConnectionOptions()
    const ds = await createConnection(connectionOptions)
    console.info(ds.options)
    await iterateBlocks(ds)
  })()
}

main()

async function iterateBlocks(ds: DataSource) {

  const startBlock = Number.parseInt(process.env.STARKNET_ARCHIVE_START_BLOCK || '0')
  const finishBlock = Number.parseInt(process.env.STARKNET_ARCHIVE_FINISH_BLOCK || '0')
  const retryWait = Number.parseInt(process.env.STARKNET_ARCHIVE_RETRY_WAIT || '1000')
  const cmd = process.env.STARKNET_ARCHIVE_CMD || 'organize'
  const feederUrl = process.env.STARKNET_ARCHIVE_FEEDER_URL || 'https://alpha4.starknet.io'
  const pathfinderUrl = process.env.STARKNET_ARCHIVE_PATHFINDER_URL || 'https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a'

  const blockApiProvider = new FeederApiProvider(/*defaultProvider*/ new Provider({ baseUrl: feederUrl}))
  const apiProvider =  new PathfinderApiProvider(pathfinderUrl)

  let p: BlockProcessor

  if(cmd == 'organize')
    p = new OrganizeBlockProcessor(blockApiProvider, apiProvider, ds)
  else if(cmd == 'archive_block')
    p = new ArchiveBlockProcessor(apiProvider, ds)
  else if(cmd == 'archive_abi')
    p = new ArchiveAbiProcessor(apiProvider, ds)
  else {
    console.error(`unknown cmd ${cmd}`)
    return
  }

  console.info(`processing blocks ${startBlock} to ${finishBlock} with ${cmd} from ${feederUrl} and ${pathfinderUrl}`)

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