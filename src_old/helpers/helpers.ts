import { getSelectorFromName } from "starknet/utils/hash";
import {setTimeout} from "timers";
export const sleep = async function(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getFullSelector = function(entrypoint: string) {
  //TODO verify logic to avoid extra zeros prepended after 0x
    const s = getSelectorFromName(entrypoint);
    // return BigNumber.from(s).toHexString();
  return s;
}

export function forceCast<T>(input: any): T {
    return input;
}

//TODO use ts-node-cache and TTL not to blow up memory with objects no longer needed as we progress thru blocks?
export class Cache<T> {
  private readonly m: { [k: string]: T } = {}

  keySN(n: number, s: string) {
    return s.concat(n.toString())
  }

  keyN(n: number) {
    return n.toString()
  }

  get(n: number, s?: string, ): T {
    const k = s ? this.keySN(n, s) : this.keyN(n)
    return this.m[k]
  }

  set(o: T, n: number, s?: string) {
    const k = s ? this.keySN(n, s) : this.keyN(n)
    this.m[k] = o
  }
}
