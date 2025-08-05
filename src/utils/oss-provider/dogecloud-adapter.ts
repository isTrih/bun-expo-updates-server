import { S3, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import {
  IOSSProvider,
  OSSConfig,
  OSSListObjectsParams,
  OSSListResult,
  OSSGetObjectParams,
  OSSGetObjectResult,
  OSSPutObjectParams,
  OSSDeleteObjectParams,
  OSSHeadObjectParams,
  OSSHeadObjectResult,
} from "./types";

import { redis } from "bun";
import { loggers, bilingualMsg } from "../logger";

// 使用通用日志工具
// Using common logging utility
const logger = loggers.oss("DogeCloud");

async function generateHmacSha1(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(signature).toString("hex");
}

export class DogeCloudAdapter implements IOSSProvider {
  private s3Client!: S3; // Using ! to indicate definite assignment
  private bucketName!: string;
  private accessKey: string;
  private secretKey: string;
  private forcePathStyle: boolean = false; // 是否强制使用路径样式访问（S3兼容）
  // Whether to force path style access (S3 compatible)
  constructor(config: OSSConfig) {
    logger.info(
      bilingualMsg(
        `初始化DogeCloud适配器，存储桶: ${config.bucket || "未指定"}`,
        `Initializing DogeCloud adapter, bucket: ${config.bucket || "unspecified"}`,
      ),
    );
    this.accessKey = config.accessKey || process.env.DOGE_CLOUD_ACCESS_KEY!;
    this.secretKey = config.secretKey || process.env.DOGE_CLOUD_SECRET_KEY!;
    this.forcePathStyle =
      config.forcePathStyle ||
      Boolean(Number(process.env.OSS_FORCE_PATH_STYLE));

    if (!this.accessKey || !this.secretKey) {
      logger.error(
        bilingualMsg(
          "DogeCloud访问密钥和密钥缺失",
          "DogeCloud access key and secret key are missing",
        ),
      );
      throw new Error("DogeCloud access key and secret key are required");
    }

    logger.info(
      bilingualMsg(
        "DogeCloud适配器配置完成",
        "DogeCloud adapter configuration completed",
      ),
    );
  }

  async initialize(): Promise<void> {
    logger.info(
      bilingualMsg(
        "初始化DogeCloud S3客户端",
        "Initializing DogeCloud S3 client",
      ),
    );
    const cacheDataKey = "dogecloud_data";
    let data: any;

    try {
      logger.debug(
        bilingualMsg(
          `检查Redis缓存: ${cacheDataKey}`,
          `Checking Redis cache: ${cacheDataKey}`,
        ),
      );
      const cacheData = await redis.get(cacheDataKey);

      // 检查缓存是否存在以及是否过期
      // Check if cache exists and if it's expired
      if (cacheData) {
        const nowTime = Date.now();
        const parsedData = JSON.parse(cacheData);
        const cacheDataExpires = parsedData.ExpiredAt * 1000;
        if (nowTime > cacheDataExpires) {
          logger.debug(
            bilingualMsg(
              `缓存已过期，过期时间: ${new Date(cacheDataExpires).toLocaleString()}`,
              `Cache expired, expiration time: ${new Date(cacheDataExpires).toLocaleString()}`,
            ),
          );
          try {
            await redis.del(cacheDataKey);
          } catch (redisError) {
            logger.warn(
              bilingualMsg(
                `删除过期缓存失败，但将继续${redisError}`,
                `Failed to delete expired cache, but will continue${redisError}`,
              ),
            );
          }
          logger.info(
            bilingualMsg("获取临时凭证", "Getting temporary credentials"),
          );
          data = await this.getTemporaryCredentials();
        } else {
          logger.debug(
            bilingualMsg(
              `使用缓存的凭证，有效期至: ${new Date(cacheDataExpires).toLocaleString()}`,
              `Using cached credentials, valid until: ${new Date(cacheDataExpires).toLocaleString()}`,
            ),
          );
          data = parsedData;
        }
      } else {
        logger.debug(
          bilingualMsg(
            "缓存不存在或Redis不可用，获取新凭证",
            "Cache doesn't exist or Redis unavailable, getting new credentials",
          ),
        );
        data = await this.getTemporaryCredentials();
      }

      // 尝试更新Redis缓存
      // Try to update Redis cache
      try {
        logger.debug(
          bilingualMsg(
            `更新Redis缓存，有效期: 7000秒`,
            `Updating Redis cache, validity: 7000 seconds`,
          ),
        );
        await redis.set(cacheDataKey, JSON.stringify(data), "EX", 7000);
      } catch (redisError) {
        logger.error(
          bilingualMsg(
            `更新Redis缓存失败，但将继续使用凭证`,
            `Failed to update Redis cache, but will continue using credentials`,
          ),
          redisError,
        );
      }
    } catch (error) {
      // Redis可能不可用，直接获取临时凭证
      // Redis might be unavailable, directly get temporary credentials
      logger.error(
        bilingualMsg(
          `Redis缓存访问失败，直接获取临时凭证`,
          `Redis cache access failed, directly getting temporary credentials`,
        ),
        error,
      );
      data = await this.getTemporaryCredentials();
    }

    const credentials = data.Credentials;
    logger.info(
      bilingualMsg(
        `创建S3客户端，端点: ${data.Buckets[0].s3Endpoint}`,
        `Creating S3 client, endpoint: ${data.Buckets[0].s3Endpoint}`,
      ),
    );
    this.s3Client = new S3({
      region: "automatic",
      endpoint: data.Buckets[0].s3Endpoint,
      credentials: credentials,
      forcePathStyle: this.forcePathStyle,
    });

    // 如果没有指定bucket，使用API返回的第一个bucket
    // If bucket is not specified, use the first bucket returned by API
    this.bucketName = data.Buckets[0].s3Bucket;
    logger.info(
      bilingualMsg(
        `使用存储桶: ${this.bucketName}`,
        `Using bucket: ${this.bucketName}`,
      ),
    );
  }

  private async getTemporaryCredentials(): Promise<any> {
    logger.info(
      bilingualMsg(
        "获取DogeCloud临时访问凭证",
        "Getting DogeCloud temporary access credentials",
      ),
    );
    const body = JSON.stringify({
      channel: "OSS_FULL",
      scopes: ["*"],
    });

    logger.debug(bilingualMsg("生成签名", "Generating signature"));
    const sign = await generateHmacSha1(
      this.secretKey,
      `/auth/tmp_token.json\n${body}`,
    );
    const authorization = `TOKEN ${this.accessKey}:${sign}`;

    logger.debug(
      bilingualMsg(
        "发送请求至DogeCloud API",
        "Sending request to DogeCloud API",
      ),
    );
    try {
      const response = await fetch(
        "https://api.dogecloud.com/auth/tmp_token.json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authorization,
          },
          body,
        },
      );

      const result = await response.json();

      if (result.code !== 200) {
        logger.error(
          bilingualMsg(
            `DogeCloud API返回错误: ${result.msg}`,
            `DogeCloud API returned error: ${result.msg}`,
          ),
          result,
        );
        throw new Error(`DogeCloud API Error: ${result.msg}`);
      }

      logger.info(
        bilingualMsg(
          "成功获取临时凭证",
          "Successfully obtained temporary credentials",
        ),
      );
      return result.data;
    } catch (error) {
      logger.error(
        bilingualMsg(
          "获取DogeCloud临时凭证失败",
          "Failed to get DogeCloud temporary credentials",
        ),
        error,
      );
      throw error;
    }
  }

  getBucketName(): string {
    logger.debug(
      bilingualMsg(
        `获取当前存储桶名称: ${this.bucketName}`,
        `Getting current bucket name: ${this.bucketName}`,
      ),
    );
    return this.bucketName;
  }

  async listObjects(params: OSSListObjectsParams): Promise<OSSListResult> {
    logger.info(
      bilingualMsg(
        `列出对象, 前缀: ${params.Prefix || "/"}`,
        `Listing objects, prefix: ${params.Prefix || "/"}`,
      ),
    );
    if (!this.s3Client) {
      logger.debug(
        bilingualMsg(
          "S3客户端未初始化，正在初始化",
          "S3 client not initialized, initializing now",
        ),
      );
      await this.initialize();
    }

    const command = {
      Bucket: params.Bucket,
      Prefix: params.Prefix,
      Delimiter: params.Delimiter,
      MaxKeys: params.MaxKeys,
      ContinuationToken: params.ContinuationToken,
    };

    try {
      logger.debug(
        bilingualMsg(
          `执行listObjectsV2, 存储桶: ${params.Bucket}`,
          `Executing listObjectsV2, bucket: ${params.Bucket}`,
        ),
      );
      const result = await this.s3Client.listObjectsV2(command);

      const objectCount = result.Contents?.length || 0;
      const prefixCount = result.CommonPrefixes?.length || 0;
      logger.info(
        bilingualMsg(
          `成功列出对象: ${objectCount}个文件, ${prefixCount}个目录`,
          `Successfully listed objects: ${objectCount} files, ${prefixCount} directories`,
        ),
      );

      return {
        Contents:
          result.Contents?.map((obj) => ({
            Key: obj.Key!,
            LastModified: obj.LastModified,
            Size: obj.Size,
            ETag: obj.ETag,
          })) || [],
        CommonPrefixes:
          result.CommonPrefixes?.map((cp) => ({
            Prefix: cp.Prefix!,
          })) || [],
        IsTruncated: result.IsTruncated,
        NextContinuationToken: result.NextContinuationToken,
      };
    } catch (error) {
      logger.error(
        bilingualMsg(
          `列出对象失败, 前缀: ${params.Prefix || "/"}`,
          `Failed to list objects, prefix: ${params.Prefix || "/"}`,
        ),
        error,
      );
      throw error;
    }
  }

  async getObject(params: OSSGetObjectParams): Promise<OSSGetObjectResult> {
    logger.info(
      bilingualMsg(
        `获取对象, 键: ${params.Key}`,
        `Getting object, key: ${params.Key}`,
      ),
    );
    if (!this.s3Client) {
      logger.debug(
        bilingualMsg(
          "S3客户端未初始化，正在初始化",
          "S3 client not initialized, initializing now",
        ),
      );
      await this.initialize();
    }

    try {
      logger.debug(
        bilingualMsg(
          `执行getObject, 存储桶: ${params.Bucket}, 键: ${params.Key}`,
          `Executing getObject, bucket: ${params.Bucket}, key: ${params.Key}`,
        ),
      );
      const result = await this.s3Client.getObject({
        Bucket: params.Bucket,
        Key: params.Key,
      });

      logger.info(
        bilingualMsg(
          `成功获取对象, 键: ${params.Key}, 大小: ${result.ContentLength || 0}字节`,
          `Successfully got object, key: ${params.Key}, size: ${result.ContentLength || 0} bytes`,
        ),
      );
      // Handle AWS SDK's stream type (Readable & SdkStreamMixin)
      // This is compatible with our updated interface
      return {
        Body: result.Body!,
        ContentType: result.ContentType,
        ContentLength: result.ContentLength,
        LastModified: result.LastModified,
        ETag: result.ETag,
      };
    } catch (error) {
      logger.error(
        bilingualMsg(
          `获取对象失败, 键: ${params.Key}`,
          `Failed to get object, key: ${params.Key}`,
        ),
        error,
      );
      throw error;
    }
  }

  async putObject(params: OSSPutObjectParams): Promise<void> {
    logger.info(
      bilingualMsg(
        `上传对象, 键: ${params.Key}, 类型: ${params.ContentType || "未指定"}`,
        `Uploading object, key: ${params.Key}, type: ${params.ContentType || "unspecified"}`,
      ),
    );
    if (!this.s3Client) {
      logger.debug(
        bilingualMsg(
          "S3客户端未初始化，正在初始化",
          "S3 client not initialized, initializing now",
        ),
      );
      await this.initialize();
    }

    try {
      logger.debug(
        bilingualMsg(
          `执行putObject, 存储桶: ${params.Bucket}, 键: ${params.Key}`,
          `Executing putObject, bucket: ${params.Bucket}, key: ${params.Key}`,
        ),
      );
      await this.s3Client.putObject({
        Bucket: params.Bucket,
        Key: params.Key,
        Body: params.Body,
        ContentType: params.ContentType,
      });
      logger.info(
        bilingualMsg(
          `成功上传对象, 键: ${params.Key}`,
          `Successfully uploaded object, key: ${params.Key}`,
        ),
      );
    } catch (error) {
      logger.error(
        bilingualMsg(
          `上传对象失败, 键: ${params.Key}`,
          `Failed to upload object, key: ${params.Key}`,
        ),
        error,
      );
      throw error;
    }
  }

  async deleteObject(params: OSSDeleteObjectParams): Promise<void> {
    logger.info(
      bilingualMsg(
        `删除对象, 键: ${params.Key}`,
        `Deleting object, key: ${params.Key}`,
      ),
    );
    if (!this.s3Client) {
      logger.debug(
        bilingualMsg(
          "S3客户端未初始化，正在初始化",
          "S3 client not initialized, initializing now",
        ),
      );
      await this.initialize();
    }

    try {
      logger.debug(
        bilingualMsg(
          `执行deleteObject, 存储桶: ${params.Bucket}, 键: ${params.Key}`,
          `Executing deleteObject, bucket: ${params.Bucket}, key: ${params.Key}`,
        ),
      );
      await this.s3Client.deleteObject({
        Bucket: params.Bucket,
        Key: params.Key,
      });
      logger.info(
        bilingualMsg(
          `成功删除对象, 键: ${params.Key}`,
          `Successfully deleted object, key: ${params.Key}`,
        ),
      );
    } catch (error) {
      logger.error(
        bilingualMsg(
          `删除对象失败, 键: ${params.Key}`,
          `Failed to delete object, key: ${params.Key}`,
        ),
        error,
      );
      throw error;
    }
  }

  async headObject(params: OSSHeadObjectParams): Promise<OSSHeadObjectResult> {
    logger.info(
      bilingualMsg(
        `获取对象元信息, 键: ${params.Key}`,
        `Getting object metadata, key: ${params.Key}`,
      ),
    );
    if (!this.s3Client) {
      logger.debug(
        bilingualMsg(
          "S3客户端未初始化，正在初始化",
          "S3 client not initialized, initializing now",
        ),
      );
      await this.initialize();
    }

    try {
      logger.debug(
        bilingualMsg(
          `执行headObject, 存储桶: ${params.Bucket}, 键: ${params.Key}`,
          `Executing headObject, bucket: ${params.Bucket}, key: ${params.Key}`,
        ),
      );
      const result = await this.s3Client.headObject({
        Bucket: params.Bucket,
        Key: params.Key,
      });

      logger.info(
        bilingualMsg(
          `成功获取对象元信息, 键: ${params.Key}, 大小: ${result.ContentLength || 0}字节`,
          `Successfully got object metadata, key: ${params.Key}, size: ${result.ContentLength || 0} bytes`,
        ),
      );
      return {
        ContentType: result.ContentType,
        ContentLength: result.ContentLength,
        LastModified: result.LastModified,
        ETag: result.ETag,
      };
    } catch (error) {
      logger.error(
        bilingualMsg(
          `获取对象元信息失败, 键: ${params.Key}`,
          `Failed to get object metadata, key: ${params.Key}`,
        ),
        error,
      );
      throw error;
    }
  }

  async generatePresignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    logger.info(
      bilingualMsg(
        `生成预签名URL, 键: ${key}, 有效期: ${expiresIn}秒`,
        `Generating presigned URL, key: ${key}, validity: ${expiresIn} seconds`,
      ),
    );
    if (!this.s3Client) {
      logger.debug(
        bilingualMsg(
          "S3客户端未初始化，正在初始化",
          "S3 client not initialized, initializing now",
        ),
      );
      await this.initialize();
    }

    // DogeCloud支持S3兼容的预签名URL
    // DogeCloud supports S3 compatible presigned URLs
    const command = {
      Bucket: this.bucketName,
      Key: key,
    };

    // 注意：这里需要根据DogeCloud的具体实现来调整
    // 可能需要使用getSignedUrl或类似的方法
    // Note: This needs to be adjusted based on DogeCloud's specific implementation
    // Might need to use getSignedUrl or similar method
    logger.error(
      bilingualMsg(
        "DogeCloud预签名URL功能尚未实现",
        "DogeCloud presigned URL feature not implemented yet",
      ),
    );
    throw new Error("generatePresignedUrl not implemented for DogeCloud yet");
  }
}
