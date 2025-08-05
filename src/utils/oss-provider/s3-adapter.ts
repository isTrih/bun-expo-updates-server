import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loggers, bilingualMsg } from "../logger";
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

export class S3Adapter implements IOSSProvider {
  private s3Client!: S3Client; // Using ! to indicate definite assignment
  private bucketName: string;
  private logger = loggers.oss("S3");

  constructor(config: OSSConfig) {
    this.bucketName = config.bucket!;
    this.logger.info(
      bilingualMsg(
        `初始化S3适配器，存储桶: ${this.bucketName}`,
        `Initializing S3 adapter, bucket: ${this.bucketName}`,
      ),
    );

    const clientConfig: any = {
      region: config.region || process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: config.accessKey || process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: config.secretKey || process.env.AWS_SECRET_ACCESS_KEY!,
      },
    };

    // 如果指定了自定义端点（比如 MinIO 或其他 S3 兼容服务）
    // If a custom endpoint is specified (e.g., MinIO or other S3-compatible services)
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle =
        config.forcePathStyle ||
        Boolean(Number(process.env.OSS_FORCE_PATH_STYLE)); // 对于自定义端点通常需要这个 // Usually needed for custom endpoints
      this.logger.info(
        bilingualMsg(
          `使用自定义端点: ${config.endpoint}`,
          `Using custom endpoint: ${config.endpoint}`,
        ),
      );
    }

    // Initialize S3Client
    this.logger.info(
      bilingualMsg(
        `初始化S3客户端，区域: ${clientConfig.region}`,
        `Initializing S3 client, region: ${clientConfig.region}`,
      ),
    );
    this.s3Client = new S3Client(clientConfig);

    // 验证必需的配置
    // Validate required configuration
    if (
      !clientConfig.credentials.accessKeyId ||
      !clientConfig.credentials.secretAccessKey
    ) {
      this.logger.error(
        bilingualMsg(
          "S3访问密钥和密钥缺失",
          "S3 access key and secret key are missing",
        ),
      );
      throw new Error("AWS S3 access key and secret key are required");
    }
    this.logger.info(
      bilingualMsg("S3适配器配置完成", "S3 adapter configuration completed"),
    );
  }

  getBucketName(): string {
    this.logger.debug(
      bilingualMsg(
        `获取当前存储桶名称: ${this.bucketName}`,
        `Getting current bucket name: ${this.bucketName}`,
      ),
    );
    return this.bucketName;
  }

  async listObjects(params: OSSListObjectsParams): Promise<OSSListResult> {
    this.logger.info(
      bilingualMsg(
        `列出对象, 前缀: ${params.Prefix || "/"}`,
        `Listing objects, prefix: ${params.Prefix || "/"}`,
      ),
    );
    const command = new ListObjectsV2Command({
      Bucket: params.Bucket,
      Prefix: params.Prefix,
      Delimiter: params.Delimiter,
      MaxKeys: params.MaxKeys,
      ContinuationToken: params.ContinuationToken,
    });

    try {
      this.logger.debug(
        bilingualMsg(
          `执行listObjectsV2, 存储桶: ${params.Bucket}`,
          `Executing listObjectsV2, bucket: ${params.Bucket}`,
        ),
      );
      const result = await this.s3Client.send(command);
      const objectCount = result.Contents?.length || 0;
      const prefixCount = result.CommonPrefixes?.length || 0;
      this.logger.info(
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
      this.logger.error(
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
    this.logger.info(
      bilingualMsg(
        `获取对象, 键: ${params.Key}`,
        `Getting object, key: ${params.Key}`,
      ),
    );
    const command = new GetObjectCommand({
      Bucket: params.Bucket,
      Key: params.Key,
    });

    try {
      this.logger.debug(
        bilingualMsg(
          `执行getObject, 存储桶: ${params.Bucket}, 键: ${params.Key}`,
          `Executing getObject, bucket: ${params.Bucket}, key: ${params.Key}`,
        ),
      );
      const result = await this.s3Client.send(command);
      this.logger.info(
        bilingualMsg(
          `成功获取对象, 键: ${params.Key}, 大小: ${result.ContentLength || 0}字节`,
          `Successfully got object, key: ${params.Key}, size: ${result.ContentLength || 0} bytes`,
        ),
      );

      // Handle the AWS SDK's streaming response
      // The Body property is a Readable & SdkStreamMixin
      // which is compatible with our interface since we updated it to accept 'any'
      return {
        Body: result.Body!,
        ContentType: result.ContentType,
        ContentLength: result.ContentLength,
        LastModified: result.LastModified,
        ETag: result.ETag,
      };
    } catch (error) {
      this.logger.error(
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
    this.logger.info(
      bilingualMsg(
        `上传对象, 键: ${params.Key}, 类型: ${params.ContentType || "未指定"}`,
        `Uploading object, key: ${params.Key}, type: ${params.ContentType || "unspecified"}`,
      ),
    );
    const command = new PutObjectCommand({
      Bucket: params.Bucket,
      Key: params.Key,
      Body: params.Body,
      ContentType: params.ContentType,
    });

    try {
      this.logger.debug(
        bilingualMsg(
          `执行putObject, 存储桶: ${params.Bucket}, 键: ${params.Key}`,
          `Executing putObject, bucket: ${params.Bucket}, key: ${params.Key}`,
        ),
      );
      await this.s3Client.send(command);
      this.logger.info(
        bilingualMsg(
          `成功上传对象, 键: ${params.Key}`,
          `Successfully uploaded object, key: ${params.Key}`,
        ),
      );
    } catch (error) {
      this.logger.error(
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
    this.logger.info(
      bilingualMsg(
        `删除对象, 键: ${params.Key}`,
        `Deleting object, key: ${params.Key}`,
      ),
    );
    const command = new DeleteObjectCommand({
      Bucket: params.Bucket,
      Key: params.Key,
    });

    try {
      this.logger.debug(
        bilingualMsg(
          `执行deleteObject, 存储桶: ${params.Bucket}, 键: ${params.Key}`,
          `Executing deleteObject, bucket: ${params.Bucket}, key: ${params.Key}`,
        ),
      );
      await this.s3Client.send(command);
      this.logger.info(
        bilingualMsg(
          `成功删除对象, 键: ${params.Key}`,
          `Successfully deleted object, key: ${params.Key}`,
        ),
      );
    } catch (error) {
      this.logger.error(
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
    this.logger.info(
      bilingualMsg(
        `获取对象元信息, 键: ${params.Key}`,
        `Getting object metadata, key: ${params.Key}`,
      ),
    );
    const command = new HeadObjectCommand({
      Bucket: params.Bucket,
      Key: params.Key,
    });

    try {
      this.logger.debug(
        bilingualMsg(
          `执行headObject, 存储桶: ${params.Bucket}, 键: ${params.Key}`,
          `Executing headObject, bucket: ${params.Bucket}, key: ${params.Key}`,
        ),
      );
      const result = await this.s3Client.send(command);
      this.logger.info(
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
      this.logger.error(
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
    this.logger.info(
      bilingualMsg(
        `生成预签名URL, 键: ${key}, 有效期: ${expiresIn}秒`,
        `Generating presigned URL, key: ${key}, validity: ${expiresIn} seconds`,
      ),
    );

    // Optional implementation that avoids @aws-sdk/s3-request-presigner dependency
    // Option 1: Return a direct URL if you're not using private buckets
    this.logger.debug(
      bilingualMsg(
        `返回标准S3 URL (非签名), 键: ${key}`,
        `Returning standard S3 URL (unsigned), key: ${key}`,
      ),
    );
    return `https://${this.bucketName}.s3.amazonaws.com/${encodeURIComponent(key)}`;

    /*
    // Option 2: If you need presigned URLs, uncomment and install the dependency:
    // npm install @aws-sdk/s3-request-presigner
    // then uncomment this code:
    // 选项2：如果你需要预签名URL，请取消注释并安装依赖:
    // npm install @aws-sdk/s3-request-presigner
    // 然后取消以下代码的注释:

    // import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
    // const command = new GetObjectCommand({
    //   Bucket: this.bucketName,
    //   Key: key,
    // });
    // return await getSignedUrl(this.s3Client, command, { expiresIn });
    */
  }
}
