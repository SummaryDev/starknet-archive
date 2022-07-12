import { DataSource, Repository } from "typeorm";
import { RawView, RawViewEntity } from "../../entities";
import * as console from "starknet-parser/lib/helpers/console";
import { ViewProvider, ApiProvider } from "../interfaces";

export class DatabaseViewProvider implements ViewProvider {
    private readonly repository: Repository<RawView>

    constructor(private readonly apiProvider: ApiProvider, ds: DataSource) {
        this.repository = ds.getRepository<RawView>(RawViewEntity)
    }

    async get(contractAddress: string, viewFunction: string, blockNumber?: number, blockHash?: string) {
        let ret

        const fromDb = await this.repository.findOneBy({
            block_number: blockNumber,
            contract_address: contractAddress,
            view_function: viewFunction
        })

        if (!fromDb) {
            const fromApi = await this.apiProvider.callView(contractAddress, viewFunction, blockNumber, blockHash)
            await this.repository.save({
                block_number: blockNumber,
                contract_address: contractAddress,
                view_function: viewFunction,
                raw: fromApi
            })
            ret = fromApi
            console.debug(`from api for ${contractAddress} ${viewFunction} ${blockNumber}`)
        } else {
            ret = fromDb.raw
            console.debug(`from db for ${contractAddress} ${viewFunction} ${blockNumber}`)
        }

        return ret
    }
}
