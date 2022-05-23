import { Connection, createConnection, getConnection } from 'typeorm'
import assert from 'assert'
import Debug from 'debug'
import config from './dbconfig'
import { getConfig as conf } from '../node'
import {STARKNET_BLOCK_TABLE_NAME} from '../entities'

export const STARKNET_STATUS_TABLE_NAME = 'starknet_status';

const debug = Debug('index-builder:helper')

export async function createDBConnection(): Promise<Connection> {
  const _config = config()
  debug(`DB config: ${JSON.stringify(_config, null, 2)}`)
  return createConnection(_config)
}

export function getIndexerHead(): Promise<number> {
  // serialization failures are possible, but let's assume they are rare
  return getConnection().transaction('SERIALIZABLE', async (em) => {
    const raw = (await em.query(`
      SELECT height FROM ${STARKNET_STATUS_TABLE_NAME} WHERE id = 0
    `)) as { height: number }[]

    assert.strictEqual(raw.length, 1, 'There must be exactly one status record')

    const height = raw[0].height

    const higherBlocks = (await em.query(
      `SELECT height FROM ${STARKNET_BLOCK_TABLE_NAME} WHERE height > $1 ORDER BY height ASC`,
      [height]
    )) as { height: number }[]

    let actualHeight = height
    for (let i = 0; i < higherBlocks.length; i++) {
      const bh = higherBlocks[i].height
      if (bh === actualHeight + 1) {
        actualHeight = bh
      }
    }

    if (actualHeight > height) {
      await em.query(`UPDATE ${STARKNET_STATUS_TABLE_NAME} SET height = $1 WHERE id = 0`, [
        actualHeight,
      ])
    }

    if (actualHeight === -1 || actualHeight < conf().BLOCK_HEIGHT) {
      return conf().BLOCK_HEIGHT - 1
    } else {
      return Number(actualHeight)
    }
  })
}

export function setIndexerHeight(height: number): Promise<void> {
  return getConnection().transaction(async (em) => {
    await em.query(
      `UPDATE ${STARKNET_STATUS_TABLE_NAME} SET height = $1 WHERE id = 0 AND height < $1`,
      [height]
    )
  })
}
