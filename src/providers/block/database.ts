import { BlockProvider, ApiProvider  } from '../interfaces'
import { DataSource, Repository } from "typeorm";
import { RawBlock, RawBlockEntity } from "../../entities";
import * as console from "starknet-parser/lib/helpers/console";

export class DatabaseBlockProvider implements BlockProvider {
  private readonly repository: Repository<RawBlock>

  constructor(private readonly apiProvider: ApiProvider, ds: DataSource) {
    this.repository = ds.getRepository<RawBlock>(RawBlockEntity)
  }

  async get(blockNumber: number) {
    let ret

    const fromDb = await this.repository.findOneBy({block_number: blockNumber})

    if (!fromDb) {
      const fromApi = await this.apiProvider.getBlock(blockNumber)
      await this.repository.save({block_number: blockNumber, raw: fromApi})
      ret = fromApi
      console.debug(`from api for ${blockNumber}`)
    } else {
      ret = fromDb.raw
      console.debug(`from db for ${blockNumber}`)
    }

    return ret
  }
}
