import {Provider} from "starknet";
import {GetBlockResponse} from "starknet-parser/src/types/rawStarknet";
import axios from "axios";
import { ApiError } from "../../helpers/error";
import { ApiProvider } from "../interfaces";

export class FeederApiProvider implements ApiProvider {
    constructor(private readonly provider: Provider) {
    }

    async getBlock(blockNumber: number) {
        let ret
        try {
            const res  = await this.provider.getBlock(blockNumber) as any
            ret = res as GetBlockResponse
        } catch (err) {
            if (axios.isAxiosError(err)) {
                throw new ApiError(err.message)
            } else
                throw (err)
        }
        return ret
    }

    async getAbi(contractAddress: string) {
        let ret
        try {
            const res = await this.provider.getCode(contractAddress)
            ret = res.abi
        } catch (err) {
            if (axios.isAxiosError(err)) {
                throw new ApiError(err.message)
            } else
                throw (err)
        }
        return ret
    }

    async callView(contractAddress: string, viewFn: string, blockNumber?: number) {
        let ret
        try {
            const res = await this.provider.callContract({
                contractAddress: contractAddress,
                entrypoint: viewFn
            }, {blockIdentifier: blockNumber})
            ret = res.result
        } catch (err) {
            if (axios.isAxiosError(err)) {
                throw new ApiError(err.message)
            } else
                throw (err)
        }
        return ret
    }
}
