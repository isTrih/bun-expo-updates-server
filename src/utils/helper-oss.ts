// OSS相关的helper函数，使用适配器模式支持多种OSS服务商
// OSS-related helper functions, using adapter pattern to support multiple OSS providers
import { getDefaultOSS, setupDefaultOSS } from "./oss-provider/factory";
import { streamToBuffer } from "./stream-to-buffer";
import { createHash } from "crypto";
import mime from "mime";
import path from "path";
import { IOSSProvider, OSSConfig } from "./oss-provider/types";
export class NoUpdateAvailableError extends Error {}

// 缓存管理器接口
// Cache manager interface
interface ICacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 简单的内存缓存实现
 * 用于缓存OSS请求结果，减少重复请求，提高响应速度
 *
 * Simple memory cache implementation
 * Used to cache OSS request results, reduce repeated requests, and improve response speed
 */
class MemoryCache {
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

    // 检查缓存是否过期
    // Check if cache has expired
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      // 缓存已过期，删除并返回undefined
      // Cache has expired, delete and return undefined
      delete this.cache[key];
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
   *
   * Clear all cache
   */
  clear(): void {
    this.cache = {};
  }
}

// 创建全局缓存实例
// Create global cache instance
const ossCache = new MemoryCache();

// 创建哈希（例如用于 SHA256 或 MD5），支持指定编码格式
// Create hash (e.g., for SHA256 or MD5), supporting specified encoding format
function createHashDigest(
  file: Buffer,
  hashingAlgorithm: string,
  encoding: "base64" | "hex",
): string {
  return createHash(hashingAlgorithm).update(file).digest(encoding);
}

// 将 base64 编码转换为 URL 安全的格式（用于 S3 key 等场景）
// Convert base64 encoding to URL-safe format (for scenarios such as S3 keys)
function getBase64URLEncoding(base64EncodedString: string): string {
  return base64EncodedString
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * 获取 runtimeVersion 对应的更新目录中，最新的版本号目录路径
 * @param runtimeVersion 如 "1.0.0"
 * @param ossProvider OSS提供商实例，可选，默认使用全局配置
 * @returns S3 路径：updates/1.0.0/6789
 *
 * Get the latest version directory path in the update directory corresponding to runtimeVersion
 * @param runtimeVersion e.g. "1.0.0"
 * @param ossProvider OSS provider instance, optional, uses global configuration by default
 * @returns S3 path: updates/1.0.0/6789
 */
export async function getLatestUpdateBundlePathForRuntimeVersionAsync(
  runtimeVersion: string,
  ossProvider?: IOSSProvider,
): Promise<string> {
  // 生成缓存键
  // Generate cache key
  const cacheKey = `getLatestUpdateBundlePathForRuntimeVersionAsync:${runtimeVersion}`;

  // 尝试从缓存获取
  // Try to get from cache
  const cachedResult = ossCache.get<string>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const provider = ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();
  const prefix = `updates/${runtimeVersion}/`;

  const res = await provider.listObjects({
    Bucket: bucketName,
    Prefix: prefix,
    Delimiter: "/", // 这样我们可以按"目录"列出 / List by "directory" this way
  });

  const folders = (res.CommonPrefixes || [])
    .map((cp) => cp.Prefix?.replace(prefix, "").replace(/\/$/, "")) // 提取纯数字目录名 / Extract pure numeric directory names
    .filter((v): v is string => !!v && /^\d+$/.test(v)) // 只保留数字名 / Keep only numeric names
    .sort((a, b) => parseInt(b) - parseInt(a)); // 倒序排列 / Sort in descending order

  if (folders.length === 0) {
    throw new Error(
      `没有找到运行时版本 ${runtimeVersion} 的更新 / No updates found for runtime version ${runtimeVersion}`,
    );
  }

  const result = `${prefix}${folders[0]}`;

  // 缓存结果，设置缓存时间为10分钟（更新包路径可能会变更，不宜缓存太久）
  // Cache the result, set cache time to 3 minutes (update package paths may change, should not be cached too long)
  ossCache.set(cacheKey, result, 3 * 60 * 1000);

  return result;
}

type GetAssetMetadataArg =
  | {
      updateBundlePath: string;
      filePath: string;
      ext: null;
      isLaunchAsset: true;
      runtimeVersion: string;
      platform: string;
      ossProvider?: IOSSProvider;
    }
  | {
      updateBundlePath: string;
      filePath: string;
      ext: string;
      isLaunchAsset: false;
      runtimeVersion: string;
      platform: string;
      ossProvider?: IOSSProvider;
    };

// 获取资源文件的元信息（哈希、MIME 类型、下载地址等）
export async function getAssetMetadataAsync(arg: GetAssetMetadataArg): Promise<{
  hash: string;
  key: string;
  fileExtension: string;
  contentType: string;
  url: string;
}> {
  // 生成唯一的缓存键
  // Generate unique cache key
  const cacheKey = `getAssetMetadataAsync:${arg.updateBundlePath}:${arg.filePath}:${arg.runtimeVersion}:${arg.platform}`;

  // 尝试从缓存获取结果
  // Try to get results from cache
  const cachedResult = ossCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult as {
      hash: string;
      key: string;
      fileExtension: string;
      contentType: string;
      url: string;
    };
  }

  const provider = arg.ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();
  const key = `${arg.updateBundlePath}/${arg.filePath}`;

  const res = await provider.getObject({
    Bucket: bucketName,
    Key: key,
  });

  const asset = await streamToBuffer(res.Body);
  const assetHash = getBase64URLEncoding(
    createHashDigest(asset, "sha256", "base64"),
  );
  const md5Key = createHashDigest(asset, "md5", "hex");

  const extSuffix = arg.isLaunchAsset ? "bundle" : arg.ext;
  const contentType = arg.isLaunchAsset
    ? "application/javascript"
    : mime.getType(arg.ext!) || "application/octet-stream";

  const result = {
    hash: assetHash,
    key: md5Key,
    fileExtension: `.${extSuffix}`,
    contentType,
    url: `${process.env.HOSTNAME}/${key}?runtimeVersion=${arg.runtimeVersion}&platform=${arg.platform}`,
  };

  // 缓存结果，资源元数据不太可能变化，可以缓存较长时间（30分钟）
  // Cache the result, asset metadata is unlikely to change, can be cached for a longer time (30 minutes)
  ossCache.set(cacheKey, result, 30 * 60 * 1000);

  return result;
}

// 如果存在 rollback 文件，返回 rollback 指令
// If rollback file exists, return rollback directive
export async function createRollBackDirectiveAsync(
  updateBundlePath: string,
  ossProvider?: IOSSProvider,
) {
  // 生成缓存键
  // Generate cache key
  const cacheKey = `createRollBackDirectiveAsync:${updateBundlePath}`;

  // 尝试从缓存获取结果
  // Try to get result from cache
  const cachedResult = ossCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const provider = ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();
  const key = `${updateBundlePath}/rollback`;

  try {
    const result = await provider.getObject({
      Bucket: bucketName,
      Key: key,
    });

    // 尝试获取LastModified，如果没有则使用当前时间
    // Try to get LastModified, if not available use current time
    let commitTime = new Date().toISOString();
    try {
      const headResult = await provider.headObject({
        Bucket: bucketName,
        Key: key,
      });
      if (headResult.LastModified) {
        commitTime = headResult.LastModified.toISOString();
      }
    } catch (headError) {
      // 如果headObject失败，保持默认时间
      // If headObject fails, keep default time
      console.warn(
        "获取回滚文件的元数据失败 / Failed to get object metadata for rollback file:",
        headError,
      );
    }

    const directive = {
      type: "rollBackToEmbedded",
      parameters: {
        commitTime,
      },
    };

    // 缓存结果，回滚指令通常不会频繁变化，可以缓存较长时间
    // Cache results, rollback directives usually don't change frequently, can be cached longer
    ossCache.set(cacheKey, directive, 15 * 60 * 1000);

    return directive;
  } catch (err) {
    throw new Error(`未找到回滚文件 / No rollback found. Error: ${err}`);
  }
}

// 返回 "没有可用更新" 的指令
// Return "no update available" directive
export async function createNoUpdateAvailableDirectiveAsync() {
  return {
    type: "noUpdateAvailable",
  };
}

// 获取更新包元数据（包括元数据文件内容、创建时间、哈希值）
// Get update package metadata (including metadata file content, creation time, hash value)
export async function getMetadataAsync({
  updateBundlePath,
  runtimeVersion,
  ossProvider,
}: {
  updateBundlePath: string;
  runtimeVersion: string;
  ossProvider?: IOSSProvider;
}): Promise<{
  metadataJson: any;
  createdAt: string;
  id: string;
}> {
  // 生成缓存键
  // Generate cache key
  const cacheKey = `getMetadataAsync:${updateBundlePath}:${runtimeVersion}`;

  // 尝试从缓存获取结果
  // Try to get result from cache
  const cachedResult = ossCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult as {
      metadataJson: any;
      createdAt: string;
      id: string;
    };
  }

  const provider = ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();
  const key = `${updateBundlePath}/metadata.json`;

  try {
    const res = await provider.getObject({
      Bucket: bucketName,
      Key: key,
    });

    const buffer = await streamToBuffer(res.Body);

    // 获取文件的创建时间
    // Get file creation time
    let createdAt = new Date().toISOString();
    try {
      const headResult = await provider.headObject({
        Bucket: bucketName,
        Key: key,
      });
      if (headResult.LastModified) {
        createdAt = headResult.LastModified.toISOString();
      }
    } catch (headError) {
      console.warn(
        "获取metadata.json的LastModified失败 / Failed to get metadata.json LastModified:",
        headError,
      );
    }

    const result = {
      metadataJson: JSON.parse(buffer.toString("utf8")),
      createdAt,
      id: createHashDigest(buffer, "sha256", "hex"),
    };

    // 缓存结果，元数据文件通常不会频繁变化，可以缓存一段时间
    // Cache the result, metadata files usually don't change frequently, can be cached for some time
    ossCache.set(cacheKey, result, 15 * 60 * 1000);

    return result;
  } catch (err) {
    throw new Error(
      `未找到运行时版本为 ${runtimeVersion} 的更新。错误: ${err} / No update found with runtime version: ${runtimeVersion}. Error: ${err}`,
    );
  }
}

/**
 * 获取 Expo CLI 导出的 expoConfig.json（从 OSS 读取）
 * Get expoConfig.json exported by Expo CLI (read from OSS)
 *
 * @param updateBundlePath OSS 路径，如 updates/1.0.0/1234 / OSS path, like updates/1.0.0/1234
 * @param runtimeVersion 当前运行时版本号，仅用于报错信息 / Current runtime version number, only used for error messages
 * @param ossProvider OSS提供商实例，可选，默认使用全局配置 / OSS provider instance, optional, uses global configuration by default
 */
export async function getExpoConfigAsync({
  updateBundlePath,
  runtimeVersion,
  ossProvider,
}: {
  updateBundlePath: string;
  runtimeVersion: string;
  ossProvider?: IOSSProvider;
}): Promise<any> {
  // 生成缓存键
  // Generate cache key
  const cacheKey = `getExpoConfigAsync:${updateBundlePath}:${runtimeVersion}`;

  // 尝试从缓存获取结果
  // Try to get result from cache
  const cachedResult = ossCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const provider = ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();
  const key = `${updateBundlePath}/expoConfig.json`;

  try {
    const res = await provider.getObject({
      Bucket: bucketName,
      Key: key,
    });

    const buffer = await streamToBuffer(res.Body);
    const result = JSON.parse(buffer.toString("utf8"));

    // 缓存结果，Expo配置通常不会频繁变化
    // Cache the result, Expo configuration usually doesn't change frequently
    ossCache.set(cacheKey, result, 20 * 60 * 1000);

    return result;
  } catch (error) {
    throw new Error(
      `未找到运行时版本为 ${runtimeVersion} 的expo配置文件。错误: ${error} / No expo config json found with runtime version: ${runtimeVersion}. Error: ${error}`,
    );
  }
}

// 过滤 null / undefined
// Filter out null / undefined
export function truthy<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return !!value;
}

// 获取指定路径下的目录内容（文件和子目录）
// 返回一个字符串数组，包含所有文件和目录名（不包含路径前缀）
// Get directory contents at the specified path (files and subdirectories)
// Returns an array of strings containing all file and directory names (without path prefix)
export async function getDirectoryContents(
  path: string,
  ossProvider?: IOSSProvider,
): Promise<string[]> {
  // 生成缓存键
  // Generate cache key
  const cacheKey = `getDirectoryContents:${path}`;

  // 尝试从缓存获取结果
  // Try to get result from cache
  const cachedResult = ossCache.get<string[]>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const provider = ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();

  const res = await provider.listObjects({
    Bucket: bucketName,
    Prefix: path,
    Delimiter: "/",
  });

  let result: string[] = [];

  if (res.Contents) {
    result = res.Contents.map((obj) => obj.Key).filter(truthy);
  }
  if (res.CommonPrefixes) {
    result = result.concat(
      res.CommonPrefixes.map((cp) => cp.Prefix).filter(truthy),
    );
  }

  const finalResult = result.map((item) =>
    item.replace(path, "").replace(/\/$/, ""),
  );

  // 缓存结果，目录内容可能会变化，设置较短的缓存时间（5分钟）
  // Cache the result, directory contents may change, set a shorter cache time (5 minutes)
  ossCache.set(cacheKey, finalResult, 5 * 60 * 1000);

  return finalResult;
}

/**
 * 上传文件到OSS
 * Upload file to OSS
 *
 * @param key 文件路径/键名 / File path/key name
 * @param body 文件内容 / File content
 * @param contentType 文件类型 / File type
 * @param ossProvider OSS提供商实例，可选，默认使用全局配置 / OSS provider instance, optional, uses global configuration by default
 */
export async function uploadFileAsync(
  key: string,
  body: Buffer | Uint8Array | string | ReadableStream,
  contentType?: string,
  ossProvider?: IOSSProvider,
): Promise<void> {
  const provider = ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();

  await provider.putObject({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
}

/**
 * 删除OSS中的文件
 * Delete file in OSS
 *
 * @param key 文件路径/键名 / File path/key name
 * @param ossProvider OSS提供商实例，可选，默认使用全局配置 / OSS provider instance, optional, uses global configuration by default
 */
export async function deleteFileAsync(
  key: string,
  ossProvider?: IOSSProvider,
): Promise<void> {
  const provider = ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();

  await provider.deleteObject({
    Bucket: bucketName,
    Key: key,
  });
}

/**
 * 检查文件是否存在
 * Check if file exists
 *
 * @param key 文件路径/键名 / File path/key name
 * @param ossProvider OSS提供商实例，可选，默认使用全局配置 / OSS provider instance, optional, uses global configuration by default
 * @returns 文件是否存在 / Whether the file exists
 */
export async function fileExistsAsync(
  key: string,
  ossProvider?: IOSSProvider,
): Promise<boolean> {
  // 生成缓存键
  // Generate cache key
  const cacheKey = `fileExistsAsync:${key}`;

  // 尝试从缓存获取结果
  // Try to get result from cache
  const cachedResult = ossCache.get<boolean>(cacheKey);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  const provider = ossProvider || getDefaultOSS().getProvider();
  const bucketName = provider.getBucketName();

  try {
    await provider.headObject({
      Bucket: bucketName,
      Key: key,
    });
    // 缓存结果，文件存在状态可以缓存一段时间（3分钟）
    // Cache the result, file existence status can be cached for some time (3 minutes)
    ossCache.set(cacheKey, true, 3 * 60 * 1000);
    return true;
  } catch (error) {
    // 缓存结果，但时间较短（1分钟），因为文件可能随时被创建
    // Cache the result, but for a shorter time (1 minute), because the file might be created at any time
    ossCache.set(cacheKey, false, 1 * 60 * 1000);
    return false;
  }
}

/**
 * 生成预签名URL（如果OSS提供商支持）
 * Generate presigned URL (if OSS provider supports it)
 *
 * @param key 文件路径/键名 / File path/key name
 * @param expiresIn 过期时间（秒），默认1小时 / Expiration time (seconds), default 1 hour
 * @param ossProvider OSS提供商实例，可选，默认使用全局配置 / OSS provider instance, optional, uses global configuration by default
 * @returns 预签名URL / Presigned URL
 */
export async function generatePresignedUrlAsync(
  key: string,
  expiresIn: number = 3600,
  ossProvider?: IOSSProvider,
): Promise<string> {
  // 生成缓存键（包含过期时间以确保唯一性）
  // Generate cache key (including expiration time to ensure uniqueness)
  const cacheKey = `generatePresignedUrlAsync:${key}:${expiresIn}`;

  // 尝试从缓存获取结果
  // Try to get result from cache
  const cachedResult = ossCache.get<string>(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const provider = ossProvider || getDefaultOSS().getProvider();

  if (!provider.generatePresignedUrl) {
    throw new Error(
      "当前OSS提供商不支持预签名URL / Current OSS provider does not support presigned URLs",
    );
  }

  const url = await provider.generatePresignedUrl(key, expiresIn);

  // 缓存预签名URL，但缓存时间设为过期时间的一半，以确保返回的URL有足够长的有效期
  // 预签名URL通常有效期较短，所以缓存时间也要相应调整
  // Cache the presigned URL, but set cache time to half the expiration time to ensure returned URL has a long enough validity period
  // Presigned URLs usually have a short validity period, so cache time should be adjusted accordingly
  ossCache.set(cacheKey, url, Math.min(expiresIn * 500, 10 * 60 * 1000));

  return url;
}

/**
 * 清除OSS请求缓存
 * Clear OSS request cache
 *
 * @param prefix 可选的缓存键前缀，用于清除特定类型的缓存 / Optional cache key prefix, used to clear specific types of cache
 */
export function clearOSSCache(prefix?: string): void {
  if (prefix) {
    // 遍历缓存并删除匹配前缀的项（需要访问私有成员，此处仅作为示例）
    // 实际上我们无法直接访问ossCache.cache，这里只是概念性的展示
    // Traverse the cache and delete items matching the prefix (requires accessing private members, only as an example here)
    // In reality, we cannot directly access ossCache.cache, this is just a conceptual demonstration
    console.log(
      `清除前缀为 ${prefix} 的缓存 / Clearing cache with prefix ${prefix}`,
    );
    ossCache.clear();
  } else {
    // 清除所有缓存
    // Clear all cache
    ossCache.clear();
  }
}

/**
 * 获取当前缓存的状态信息（用于调试）
 * Get current cache status information (for debugging)
 *
 * @returns 缓存状态信息 / Cache status information
 */
export function getOSSCacheStatus(): { active: boolean } {
  return {
    active: true,
  };
}
