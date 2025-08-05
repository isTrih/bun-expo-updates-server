import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";
import { MemoryCache, createMemoryCache } from "../../utils/memory-cache";

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  test("should store and retrieve values", () => {
    cache.set("key1", "value1");
    expect(cache.get<string>("key1")).toBe("value1");
  });

  test("should return undefined for non-existent keys", () => {
    expect(cache.get("non-existent")).toBeUndefined();
  });

  test("should respect TTL", async () => {
    // Set with very short TTL (10ms)
    cache.set("key1", "value1", 10);
    expect(cache.get<string>("key1")).toBe("value1");

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(cache.get("key1")).toBeUndefined();
  });

  test("should delete specific cache item", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.delete("key1");
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get<string>("key2")).toBe("value2");
  });

  test("should clear all cache items", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.clear();
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBeUndefined();
  });

  test("should check if key exists", () => {
    cache.set("key1", "value1");

    expect(cache.has("key1")).toBe(true);
    expect(cache.has("non-existent")).toBe(false);
  });

  test("should return correct size", () => {
    expect(cache.size()).toBe(0);

    cache.set("key1", "value1");
    expect(cache.size()).toBe(1);

    cache.set("key2", "value2");
    expect(cache.size()).toBe(2);

    cache.delete("key1");
    expect(cache.size()).toBe(1);

    cache.clear();
    expect(cache.size()).toBe(0);
  });

  test("should get all keys", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    const keys = cache.getKeys();
    expect(keys).toContain("key1");
    expect(keys).toContain("key2");
    expect(keys.length).toBe(2);
  });

  test("should get cache status", () => {
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    const status = cache.getStatus();
    expect(status.count).toBe(2);
    expect(status.keys).toContain("key1");
    expect(status.keys).toContain("key2");
  });
});

describe("createMemoryCache", () => {
  test("should create a MemoryCache instance", () => {
    const cache = createMemoryCache();
    expect(cache).toBeInstanceOf(MemoryCache);
  });
});

// 测试模拟时间以验证TTL功能
describe("MemoryCache with mocked time", () => {
  let cache: MemoryCache;
  const originalDateNow = Date.now;

  beforeEach(() => {
    cache = new MemoryCache();
    // 模拟时间从 1000 开始
    Date.now = () => 1000;
  });

  test("should respect TTL with mocked time", () => {
    cache.set("key1", "value1", 100); // TTL 100ms
    expect(cache.get<string>("key1")).toBe("value1");

    // 增加时间但不超过TTL
    Date.now = () => 1050;
    expect(cache.get<string>("key1")).toBe("value1");

    // 增加时间超过TTL
    Date.now = () => 1101;
    expect(cache.get("key1")).toBeUndefined();
  });

  // 清理
  afterEach(() => {
    Date.now = originalDateNow;
  });
});
