// OSS适配器接口和类型定义

export interface OSSObject {
  Key: string;
  LastModified?: Date;
  Size?: number;
  ETag?: string;
}

export interface OSSListResult {
  Contents?: OSSObject[];
  CommonPrefixes?: { Prefix: string }[];
  IsTruncated?: boolean;
  NextContinuationToken?: string;
}

export interface OSSGetObjectResult {
  Body: ReadableStream | Buffer | Uint8Array | string | any; // 'any' to support AWS SDK's Readable & SdkStreamMixin
  ContentType?: string;
  ContentLength?: number;
  LastModified?: Date;
  ETag?: string;
}

export interface OSSListObjectsParams {
  Bucket: string;
  Prefix?: string;
  Delimiter?: string;
  MaxKeys?: number;
  ContinuationToken?: string;
}

export interface OSSGetObjectParams {
  Bucket: string;
  Key: string;
}

export interface OSSPutObjectParams {
  Bucket: string;
  Key: string;
  Body: Buffer | Uint8Array | string | ReadableStream;
  ContentType?: string;
}

export interface OSSDeleteObjectParams {
  Bucket: string;
  Key: string;
}

export interface OSSHeadObjectParams {
  Bucket: string;
  Key: string;
}

export interface OSSHeadObjectResult {
  ContentType?: string;
  ContentLength?: number;
  LastModified?: Date;
  ETag?: string;
}

// OSS服务提供商接口
export interface IOSSProvider {
  // 获取存储桶名称
  getBucketName(): string;

  // 列出对象
  listObjects(params: OSSListObjectsParams): Promise<OSSListResult>;

  // 获取对象
  getObject(params: OSSGetObjectParams): Promise<OSSGetObjectResult>;

  // 上传对象
  putObject(params: OSSPutObjectParams): Promise<void>;

  // 删除对象
  deleteObject(params: OSSDeleteObjectParams): Promise<void>;

  // 获取对象元数据
  headObject(params: OSSHeadObjectParams): Promise<OSSHeadObjectResult>;

  // 生成预签名URL（可选）
  generatePresignedUrl?(key: string, expiresIn?: number): Promise<string>;
}

// OSS配置接口
export interface OSSConfig {
  provider: "dogecloud" | "qiniu" | "s3" | "custom";
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKey?: string;
  secretKey?: string;
  forcePathStyle?: boolean; // 是否强制使用路径样式访问（S3兼容）
  customDomain?: string; // 自定义域名（如果有的话）
  // 自定义配置
  [key: string]: any;
}

// OSS提供商工厂接口
export interface IOSSProviderFactory {
  createProvider(config: OSSConfig): Promise<IOSSProvider>;
}
