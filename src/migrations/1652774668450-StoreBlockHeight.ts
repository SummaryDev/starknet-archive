import { MigrationInterface, QueryRunner } from 'typeorm'
import {STARKNET_STATUS_TABLE_NAME} from '../db'

export class StoreBlockHeight1652774668450 implements MigrationInterface {
  public async up(db: QueryRunner): Promise<void> {
    db.query(`
        CREATE TABLE ${STARKNET_STATUS_TABLE_NAME} (
          id int primary key,
          height integer not null
        )
      `)
    db.query(`
        INSERT INTO ${STARKNET_STATUS_TABLE_NAME} (id, height) VALUES (0, -1)
      `)
  }

  public async down(db: QueryRunner): Promise<void> {
    db.query(`DROP TABLE ${STARKNET_STATUS_TABLE_NAME}`)
  }
}
