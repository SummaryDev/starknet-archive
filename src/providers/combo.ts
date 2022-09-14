import {PathfinderApiProvider} from "./pathfinder";
import {ApiProvider} from "./interfaces";
import {FeederApiProvider} from "./feeder";

export class ComboApiProvider extends PathfinderApiProvider implements ApiProvider {
  private readonly feederApiProvider

  constructor(pathfinderUrl: string, private readonly network: string) {
    super(pathfinderUrl)
    this.feederApiProvider = new FeederApiProvider(network)
  }

  async getClassAbi(classHash: string) {
    return this.feederApiProvider.getClassAbi(classHash)
  }

  async getContractAbi(contractAddress: string) {
    return this.feederApiProvider.getContractAbi(contractAddress)
  }
}