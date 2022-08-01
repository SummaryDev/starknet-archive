import {createConnection, getConnectionOptions, DataSource} from "typeorm"
import {sleep} from './helpers/helpers'
import {BlockProcessor} from './interfaces';
import {OrganizeBlockProcessor} from './processors/organize-block'
import {PathfinderApiProvider} from "./providers/api/pathfinder";

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
  const startBlock = Number.parseInt(process.env.STARKNET_ARCHIVE_START_BLOCK || '0')
  const finishBlock = Number.parseInt(process.env.STARKNET_ARCHIVE_FINISH_BLOCK || '0')
  const retryWait = Number.parseInt(process.env.STARKNET_ARCHIVE_RETRY_WAIT || '1000')
  const cmd = process.env.STARKNET_ARCHIVE_CMD || 'organize'
  const feederUrl = process.env.STARKNET_ARCHIVE_FEEDER_URL || 'https://alpha4.starknet.io'
  const pathfinderUrl = process.env.STARKNET_ARCHIVE_PATHFINDER_URL || 'https://nd-862-579-607.p2pify.com/07778cfc6ee00fb6002836a99081720a'


  // const feederApiProvider = new FeederApiProvider(/*defaultProvider*/ new Provider({ baseUrl: feederUrl}))
  const pathfinderApiProvider = new PathfinderApiProvider(pathfinderUrl)

  const blockApiProvider = pathfinderApiProvider // TODO revisit this as pathfinder may start providing full blocks with calldata
  const contractApiProvider = pathfinderApiProvider
  const classApiProvider =  pathfinderApiProvider // TODO revisit this as pathfinder may start providing class abi like the feeder
  const viewApiProvider =  pathfinderApiProvider
  let p: BlockProcessor

  if(cmd == 'organize') {
    p = new OrganizeBlockProcessor(blockApiProvider, contractApiProvider, classApiProvider, viewApiProvider, ds)
  } else {
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
  }

}