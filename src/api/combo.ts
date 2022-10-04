import {PathfinderApi} from "./pathfinder";
import {Api} from "./interfaces";
import {FeederApi} from "./feeder";
import {AbiApi} from "./abi";

export class ComboApi extends PathfinderApi implements Api {
  private readonly feederApiProvider
  private readonly abiApiProvider

  constructor(pathfinderUrl: string, private readonly network?: string, private readonly abiUrl?: string) {
    super(pathfinderUrl)
    this.feederApiProvider = new FeederApi(network)
    this.abiApiProvider = new AbiApi(abiUrl)
  }

  async getClassAbi(classHash: string) {
    // return this.feederApiProvider.getClassAbi(classHash)
    return this.abiApiProvider.getClassAbi(classHash)
  }

  async getContractAbi(contractAddress: string) {
    // return this.feederApiProvider.getContractAbi(contractAddress)
    return this.abiApiProvider.getContractAbi(contractAddress)
  }
}