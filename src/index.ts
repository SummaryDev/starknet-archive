import 'dotenv/config'
import {createConnection, getConnectionOptions, DataSource} from "typeorm"
import {defaultProvider} from 'starknet'
import * as console from 'starknet-parser/lib/helpers/console'
import {sleep} from 'starknet-parser/lib/helpers/helpers'
import {ArchiveAbiProcessor, ArchiveBlockProcessor, BlockProcessor, OrganizeBlockProcessor} from "./processors";

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

  const startBlock = Number.parseInt(process.env.START_BLOCK || '0')
  const finishBlock = Number.parseInt(process.env.FINISH_BLOCK || '0')
  const retryWait = Number.parseInt(process.env.RETRY_WAIT || '5000')
  const cmd = process.env.STARKNET_ARCHIVE_CMD || 'organize'

  let p: BlockProcessor

  if(cmd == 'organize')
    p = new OrganizeBlockProcessor(defaultProvider, ds)
  else if(cmd == 'archive_block')
    p = new ArchiveBlockProcessor(defaultProvider, ds)
  else if(cmd == 'archive_abi')
    p = new ArchiveAbiProcessor(defaultProvider, ds)
  else {
    console.error(`unknown cmd ${cmd}`)
    return
  }

  console.info(`processing blocks ${startBlock} to ${finishBlock} with ${cmd}`)

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