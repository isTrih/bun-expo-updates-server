/**
 * 内存缓存模块 - Memory Cache Module
 * 提供简单的内存缓存实现，用于临时存储数据，减少重复计算或网络请求
 * Provides a simple memory cache implementation for temporary data storage,
 * reducing repeated computations or network requests
 */

/**
 * 缓存项接口定义
 * Cache item interface definition
 */
export interface ICacheItem<T> {
  /** 存储的数据 / Stored data */
  data: T;
  /** 缓存创建时间戳 / Cache creation timestamp */
  timestamp: number;
  /** 生存时间(毫秒) / Time to live (milliseconds) */
  ttl: number;
}

/**
 * 内存缓存类
 * Memory cache class
 */
export class MemoryCache {
  /** 缓存存储对象 / Cache storage object */
  private cache: Record<string, ICacheItem<any>> = {};

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存的数据或undefined（如果不存在或已过期）
   *
   * Get cached item
   * @param key Cache key
   * @returns Cached data or undefined (if it doesn't exist or has expired)
   */
  get<T>(key: string): T | undefined {
    const item = this.cache[key];
    if (!item) return undefined;

    // 检查缓存是否过期 / Check if cache has expired
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      // 缓存已过期，删除并返回undefined
      // Cache has expired, delete and return undefined
      this.delete(key);
      return undefined;
    }

    return item.data;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param data 要缓存的数据
   * @param ttl 生存时间（毫秒），默认5分钟
   *
   * Set cache item
   * @param key Cache key
   * @param data Data to be cached
   * @param ttl Time to live (milliseconds), default 5 minutes
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      ttl,
    };
  }

  /**
   * 清除指定的缓存项
   * @param key 缓存键
   *
   * Clear specified cache item
   * @param key Cache key
   */
  delete(key: string): void {
    delete this.cache[key];
  }

  /**
   * 清除所有缓存
   * Clear all cache
   */
  clear(): void {
    this.cache = {};
  }

  /**
   * 获取所有缓存键
   * Get all cache keys
   *
   * @returns 所有缓存键的数组 / Array of all cache keys
   */
  getKeys(): string[] {
    return Object.keys(this.cache);
  }

  /**
   * 获取缓存项数量
   * Get number of cache items
   *
   * @returns 缓存项数量 / Number of cache items
   */
  size(): number {
    return Object.keys(this.cache).length;
  }

  /**
   * 检查是否存在指定键的缓存项（不考虑是否过期）
   * Check if a cache item with the specified key exists (regardless of expiration)
   *
   * @param key 缓存键 / Cache key
   * @returns 是否存在 / Whether it exists
   */
  has(key: string): boolean {
    return key in this.cache;
  }

  /**
   * 获取缓存状态
   * Get cache status
   *
   * @returns 缓存状态对象 / Cache status object
   */
  getStatus(): { count: number, keys: string[] } {
    return {
      count: this.size(),
      keys: this.getKeys()
    };
  }
}

/**
 * 创建一个新的内存缓存实例
 * Create a new memory cache instance
 *
 * @returns 新的内存缓存实例 / New memory cache instance
 */
export function createMemoryCache(): MemoryCache {
  return new MemoryCache();
}

/**
 * 默认导出内存缓存工厂函数
 * Default export memory cache factory function
 */
export default createMemoryCache;
