import { ViewProvider, ApiProvider } from "../interfaces";

export class ApiViewProvider implements ViewProvider {
    constructor(private readonly provider: ApiProvider) {
    }

    async get(contractAddress: string, viewFunction: string, blockNumber?: number, blockHash?: string) {
        return await this.provider.callView(contractAddress, viewFunction, blockNumber, blockHash)
    }
}
