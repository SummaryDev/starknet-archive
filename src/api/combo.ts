import {PathfinderApi} from "./pathfinder";
import {Api} from "./interfaces";
import {FeederApi} from "./feeder";

export class ComboApi extends PathfinderApi implements Api {
  private readonly feederApiProvider

  constructor(pathfinderUrl: string, private readonly network: string) {
    super(pathfinderUrl)
    this.feederApiProvider = new FeederApi(network)
  }

  async getClassAbi(classHash: string) {
    return this.feederApiProvider.getClassAbi(classHash)
  }

  async getContractAbi(contractAddress: string) {
    return this.feederApiProvider.getContractAbi(contractAddress)
  }
}