import dotenv from 'dotenv'
import chalk from 'chalk'
import figlet from 'figlet'
import commander from 'commander'
import { configure, IndexerStarter, cleanUp } from './node'

function info(msg: string): void {
  console.log(`${chalk.green('INFO')}: ${msg}`)
}

const withErrors = (command: (...args: any[]) => Promise<void>) => {
  return async (...args: any[]) => {
    try {
      await command(...args)
    } catch (e) {
      console.log(chalk.red((e as Error).stack))
      process.exit(1)
    }
  }
}

const withEnvs = (command: (opts: Record<string, string>) => Promise<void>) => {
  return async (opts: Record<string, string>) => {
    setUp(opts)
    await command(opts)
  }
}

function main(): commander.Command {
  console.log(chalk.green(figlet.textSync('Starknet-Indexer')))
  const program = new commander.Command()
  const version = process.env.npm_package_version || 'UNKNOWN'

  program.version(version).description('Starknet Indexer')

  program
    .command('index')
    .option('-h, --height <height>', 'starting block height')
    .option('-e, --env <file>', '.env file location', '.env')
    .description('Index all blocks and transactions in the starknet chain')
    .action(withErrors(withEnvs(runIndexer)))

  program
    .command('migrate')
    .description('Create indexer schema')
    .option('-e, --env <file>', '.env file location', '../../.env')
    .action(withErrors(withEnvs(runMigrations)))

  program.parse(process.argv)

  return program
}

function setUp(opts: Record<string, string>) {
  // dotenv config
  dotenv.config()
  dotenv.config({ path: opts.env })

  // here we just translate the flags into env variables, defaults will be
  // set later
  process.env.BLOCK_HEIGHT = opts.height ?? process.env.BLOCK_HEIGHT ?? 0
  // process.env.LOG_CONFIG = opts.logging || process.env.LOG_CONFIG

  process.env.WS_PROVIDER_ENDPOINT_URI =
    opts.provider || process.env.WS_PROVIDER_ENDPOINT_URI
}

async function runIndexer() {
  configure()
  info('Starting indexer')
  await IndexerStarter.index()
}

async function runMigrations() {
  info(`Running migrations`)
  await IndexerStarter.migrate()
}

process.on('SIGINT', async () => {
  info(`SIGINT: terminating`)
  await cleanUp()
})

process.on('SIGTERM', async () => {
  info(`SIGTERM: terminating`)
  await cleanUp()
})

main()
