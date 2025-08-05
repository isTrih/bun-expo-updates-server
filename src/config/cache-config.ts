/**
 * 缓存配置模块 - Cache Configuration Module
 *
 * 这个模块用于配置应用程序的缓存策略
 * This module is used to configure the application's cache strategy
 */

import { createMemoryCache, MemoryCache } from "../utils/memory-cache";

// 定义不同的缓存域，用于隔离不同类型的缓存数据
// Define different cache domains to isolate different types of cache data
export enum CacheDomain {
  OSS = "oss",
  UPDATES = "updates",
  MANIFESTS = "manifests",
  ASSETS = "assets",
}

// 缓存实例的映射，每个域一个缓存实例
// Cache instance mapping, one cache instance per domain
const cacheInstances: Record<CacheDomain, MemoryCache> = {
  [CacheDomain.OSS]: createMemoryCache(),
  [CacheDomain.UPDATES]: createMemoryCache(),
  [CacheDomain.MANIFESTS]: createMemoryCache(),
  [CacheDomain.ASSETS]: createMemoryCache(),
};

// 默认缓存TTL（生存时间）配置（单位：毫秒）
// Default cache TTL (time to live) configuration (in milliseconds)
export const DEFAULT_CACHE_TTL = {
  [CacheDomain.OSS]: 7200 * 1000, // 2小时 / 2 hours
  [CacheDomain.UPDATES]: 300 * 1000, // 5分钟 / 5 minutes
  [CacheDomain.MANIFESTS]: 600 * 1000, // 10分钟 / 10 minutes
  [CacheDomain.ASSETS]: 3600 * 1000, // 1小时 / 1 hour
};

/**
 * 获取指定域的缓存实例
 * Get the cache instance for the specified domain
 *
 * @param domain 缓存域 / Cache domain
 * @returns 缓存实例 / Cache instance
 */
export function getCache(domain: CacheDomain): MemoryCache {
  return cacheInstances[domain];
}

/**
 * 构建缓存键，包含域前缀
 * Build cache key with domain prefix
 *
 * @param domain 缓存域 / Cache domain
 * @param key 原始键 / Original key
 * @returns 带前缀的缓存键 / Cache key with prefix
 */
export function buildCacheKey(domain: CacheDomain, key: string): string {
  return `${domain}:${key}`;
}

/**
 * 清除指定域的所有缓存
 * Clear all cache in the specified domain
 *
 * @param domain 缓存域 / Cache domain
 */
export function clearDomainCache(domain: CacheDomain): void {
  cacheInstances[domain].clear();
}

/**
 * 清除所有缓存
 * Clear all cache
 */
export function clearAllCache(): void {
  Object.values(cacheInstances).forEach(cache => cache.clear());
}

/**
 * 获取所有缓存的统计信息
 * Get statistics for all caches
 *
 * @returns 缓存统计信息 / Cache statistics
 */
export function getCacheStats(): Record<CacheDomain, { count: number, keys: string[] }> {
  const stats: Record<string, { count: number, keys: string[] }> = {};

  Object.entries(cacheInstances).forEach(([domain, cache]) => {
    stats[domain as CacheDomain] = cache.getStatus();
  });

  return stats as Record<CacheDomain, { count: number, keys: string[] }>;
}

export default {
  getCache,
  buildCacheKey,
  clearDomainCache,
  clearAllCache,
  getCacheStats,
  DEFAULT_CACHE_TTL,
  CacheDomain,
};
