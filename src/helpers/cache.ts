import { CacheContainer } from 'node-ts-cache'
import { MemoryStorage } from 'node-ts-cache-storage-memory'
import {ICachingOptions} from "node-ts-cache/dist/cache-container/cache-container-types";

export class MemoryCache {
  private static _instance: MemoryCache

  private cache: CacheContainer
  private constructor() {
    this.cache = new CacheContainer(new MemoryStorage())
  }

  public static getInstance(): MemoryCache {
    if (!MemoryCache._instance) {
      MemoryCache._instance = new MemoryCache()
    }
    return MemoryCache._instance
  }

  public get<T>(key: string): Promise<T | undefined> {
    return this.cache.getItem<T>(key)
  }

  public set<T>(key: string, item: any): Promise<void> {
    const options: Partial<ICachingOptions> = {
      ttl: 60 * 60
    }
    return this.cache.setItem(key, item, options)
  }
}