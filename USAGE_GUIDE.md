# OSS 适配器系统使用指南

本指南将帮助您了解如何使用新的 OSS 适配器系统，以及如何从旧的 `helper.ts` 迁移到新系统。

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [基本使用](#基本使用)
- [高级功能](#高级功能)
- [自定义适配器](#自定义适配器)
- [迁移指南](#迁移指南)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

## 概述

新的 OSS 适配器系统提供了以下优势：

- **可扩展性**: 轻松添加新的云存储服务商支持
- **统一接口**: 所有存储服务使用相同的 API
- **类型安全**: 完整的 TypeScript 类型支持
- **多实例**: 同时使用多个不同的存储服务
- **易于测试**: 支持模拟和测试
- **配置灵活**: 支持环境变量和代码配置

## 快速开始

### 1. 安装依赖

确保您已安装必要的依赖：

```bash
# 如果使用 DogeCloud
npm install @aws-sdk/client-s3

# 如果使用 AWS S3
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Redis (用于缓存)
npm install bun redis
```

### 2. 设置环境变量

根据您使用的存储服务商设置相应的环境变量：

```bash
# DogeCloud
export DOGE_CLOUD_ACCESS_KEY=your_access_key
export DOGE_CLOUD_SECRET_KEY=your_secret_key

# AWS S3
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

# 指定默认使用的 OSS 提供商
export OSS_PROVIDER=dogecloud
```

### 3. 初始化 OSS

在您的应用启动时初始化 OSS：

```typescript
import { setupDefaultOSS, createOSSConfig } from './src/utils/oss-provider/factory';

async function initApp() {
  // 创建配置
  const config = createOSSConfig('dogecloud', 'your-bucket-name');
  
  // 设置为默认 OSS
  await setupDefaultOSS(config);
  
  console.log('OSS initialized successfully');
}

initApp().catch(console.error);
```

### 4. 使用 OSS 功能

```typescript
import {
  getLatestUpdateBundlePathForRuntimeVersionAsync,
  getAssetMetadataAsync,
  uploadFileAsync
} from './src/utils/helper-oss';

// 获取最新更新路径
const latestPath = await getLatestUpdateBundlePathForRuntimeVersionAsync('1.0.0');

// 获取资源元数据
const metadata = await getAssetMetadataAsync({
  updateBundlePath: latestPath,
  filePath: 'bundle.js',
  ext: null,
  isLaunchAsset: true,
  runtimeVersion: '1.0.0',
  platform: 'ios',
});

// 上传文件
await uploadFileAsync('path/to/file.txt', fileBuffer, 'text/plain');
```

## 配置说明

### DogeCloud 配置

```typescript
const dogecloudConfig = createOSSConfig('dogecloud', 'bucket-name', {
  accessKey: 'your-access-key',      // 可选，默认从环境变量读取
  secretKey: 'your-secret-key',      // 可选，默认从环境变量读取
});
```

### AWS S3 配置

```typescript
const s3Config = createOSSConfig('s3', 'bucket-name', {
  region: 'us-east-1',
  accessKey: 'your-access-key',      // 可选，默认从环境变量读取
  secretKey: 'your-secret-key',      // 可选，默认从环境变量读取
  endpoint: 'https://s3.amazonaws.com', // 可选，用于自定义端点
});
```

### 自定义配置

```typescript
const customConfig = createOSSConfig('custom', 'bucket-name', {
  endpoint: 'https://your-custom-endpoint.com',
  region: 'your-region',
  accessKey: 'your-access-key',
  secretKey: 'your-secret-key',
  // 任何其他自定义配置
  customOption: 'custom-value',
});
```

## 基本使用

### 初始化和配置

```typescript
import { 
  setupDefaultOSS, 
  createOSSConfig, 
  getDefaultOSS,
  OSSManager 
} from './src/utils/oss-provider/factory';

// 方式1: 使用全局默认配置
const config = createOSSConfig('dogecloud', 'my-bucket');
await setupDefaultOSS(config);

// 方式2: 创建独立的管理器实例
const manager = new OSSManager(config);
await manager.initialize();
```

### 文件操作

```typescript
import {
  uploadFileAsync,
  deleteFileAsync,
  fileExistsAsync,
  getDirectoryContents
} from './src/utils/helper-oss';

// 上传文件
await uploadFileAsync('uploads/file.txt', buffer, 'text/plain');

// 检查文件是否存在
const exists = await fileExistsAsync('uploads/file.txt');

// 删除文件
if (exists) {
  await deleteFileAsync('uploads/file.txt');
}

// 列出目录内容
const contents = await getDirectoryContents('uploads/');
console.log('Directory contents:', contents);
```

### 更新包管理

```typescript
// 获取最新更新路径
const latestPath = await getLatestUpdateBundlePathForRuntimeVersionAsync('1.0.0');

// 获取元数据
const metadata = await getMetadataAsync({
  updateBundlePath: latestPath,
  runtimeVersion: '1.0.0',
});

// 获取 Expo 配置
const expoConfig = await getExpoConfigAsync({
  updateBundlePath: latestPath,
  runtimeVersion: '1.0.0',
});

// 创建回滚指令
try {
  const rollbackDirective = await createRollBackDirectiveAsync(latestPath);
  console.log('Rollback available:', rollbackDirective);
} catch (error) {
  console.log('No rollback available');
}
```

## 高级功能

### 多实例使用

```typescript
// 创建多个 OSS 管理器
const productionOSS = new OSSManager(createOSSConfig('s3', 'prod-bucket'));
const stagingOSS = new OSSManager(createOSSConfig('dogecloud', 'staging-bucket'));

await productionOSS.initialize();
await stagingOSS.initialize();

// 在不同环境中使用不同的 OSS
const prodPath = await getLatestUpdateBundlePathForRuntimeVersionAsync(
  '1.0.0',
  productionOSS.getProvider()
);

const stagingPath = await getLatestUpdateBundlePathForRuntimeVersionAsync(
  '1.0.0',
  stagingOSS.getProvider()
);
```

### 预签名 URL

```typescript
import { generatePresignedUrlAsync } from './src/utils/helper-oss';

// 生成预签名 URL（如果提供商支持）
try {
  const presignedUrl = await generatePresignedUrlAsync(
    'path/to/file.txt',
    3600 // 1小时过期
  );
  console.log('Presigned URL:', presignedUrl);
} catch (error) {
  console.log('Presigned URLs not supported by current provider');
}
```

### 批量操作

```typescript
// 批量上传文件
async function batchUpload(files: { [key: string]: Buffer }) {
  const uploadPromises = Object.entries(files).map(([key, buffer]) => 
    uploadFileAsync(key, buffer)
  );
  
  await Promise.all(uploadPromises);
  console.log(`Uploaded ${Object.keys(files).length} files`);
}

// 批量删除文件
async function batchDelete(keys: string[]) {
  const deletePromises = keys.map(key => deleteFileAsync(key));
  await Promise.all(deletePromises);
  console.log(`Deleted ${keys.length} files`);
}
```

## 自定义适配器

### 创建自定义适配器

```typescript
import { IOSSProvider, OSSConfig } from './src/utils/oss-provider/types';

export class MyCustomOSSAdapter implements IOSSProvider {
  private config: OSSConfig;
  private client: any; // 您的客户端实例

  constructor(config: OSSConfig) {
    this.config = config;
    // 初始化您的客户端
    this.client = new MyCustomClient({
      endpoint: config.endpoint,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
  }

  getBucketName(): string {
    return this.config.bucket;
  }

  async listObjects(params: OSSListObjectsParams): Promise<OSSListResult> {
    // 实现列出对象的逻辑
    const result = await this.client.listObjects({
      bucket: params.Bucket,
      prefix: params.Prefix,
      delimiter: params.Delimiter,
    });

    return {
      Contents: result.objects?.map(obj => ({
        Key: obj.name,
        LastModified: obj.lastModified,
        Size: obj.size,
      })) || [],
      CommonPrefixes: result.prefixes?.map(prefix => ({
        Prefix: prefix,
      })) || [],
    };
  }

  async getObject(params: OSSGetObjectParams): Promise<OSSGetObjectResult> {
    const result = await this.client.getObject(params.Bucket, params.Key);
    return {
      Body: result.body,
      ContentType: result.contentType,
      LastModified: result.lastModified,
    };
  }

  async putObject(params: OSSPutObjectParams): Promise<void> {
    await this.client.putObject(
      params.Bucket,
      params.Key,
      params.Body,
      { contentType: params.ContentType }
    );
  }

  async deleteObject(params: OSSDeleteObjectParams): Promise<void> {
    await this.client.deleteObject(params.Bucket, params.Key);
  }

  async headObject(params: OSSHeadObjectParams): Promise<OSSHeadObjectResult> {
    const result = await this.client.headObject(params.Bucket, params.Key);
    return {
      ContentType: result.contentType,
      ContentLength: result.contentLength,
      LastModified: result.lastModified,
    };
  }

  // 可选方法
  async generatePresignedUrl(key: string, expiresIn?: number): Promise<string> {
    return this.client.generatePresignedUrl(this.config.bucket, key, expiresIn);
  }
}
```

### 注册自定义适配器

```typescript
import { OSSProviderFactory } from './src/utils/oss-provider/factory';
import { MyCustomOSSAdapter } from './my-custom-adapter';

// 注册适配器
const factory = OSSProviderFactory.getInstance();
factory.registerProvider('mycustom', MyCustomOSSAdapter);

// 使用自定义适配器
const config = createOSSConfig('mycustom' as any, 'my-bucket', {
  endpoint: 'https://my-custom-oss.com',
  accessKey: 'my-access-key',
  secretKey: 'my-secret-key',
});

await setupDefaultOSS(config);
```

## 迁移指南

### 从旧的 helper.ts 迁移

#### 步骤 1: 替换导入

**旧代码:**
```typescript
import { DogeClient, BUCKET_NAME } from './utils/oss-provider/dogecloud';
import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
```

**新代码:**
```typescript
import { setupDefaultOSS, createOSSConfig } from './utils/oss-provider/factory';
import {
  getLatestUpdateBundlePathForRuntimeVersionAsync,
  getAssetMetadataAsync,
  // ... 其他需要的函数
} from './utils/helper-oss';
```

#### 步骤 2: 初始化配置

**在应用启动时添加:**
```typescript
const config = createOSSConfig('dogecloud', process.env.BUCKET_NAME || 'default-bucket');
await setupDefaultOSS(config);
```

#### 步骤 3: 替换直接的 S3 调用

**旧代码:**
```typescript
const res = await DogeClient.send(new GetObjectCommand({
  Bucket: BUCKET_NAME,
  Key: 'some-key',
}));
```

**新代码:**
```typescript
import { getDefaultOSS } from './utils/oss-provider/factory';

const provider = getDefaultOSS().getProvider();
const res = await provider.getObject({
  Bucket: provider.getBucketName(),
  Key: 'some-key',
});
```

#### 步骤 4: 使用封装好的函数

大多数常用操作已经封装在 `helper-oss.ts` 中，可以直接使用：

```typescript
// 而不是手动构建 S3 命令，直接使用封装好的函数
const latestPath = await getLatestUpdateBundlePathForRuntimeVersionAsync('1.0.0');
const metadata = await getAssetMetadataAsync({...});
```

### 完整的迁移示例

```typescript
// 旧服务类
class OldExpoUpdatesService {
  async getUpdate(runtimeVersion: string) {
    const res = await DogeClient.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `updates/${runtimeVersion}/`,
      Delimiter: '/',
    }));
    // ... 手动处理响应
  }
}

// 新服务类
class NewExpoUpdatesService {
  async initialize() {
    const config = createOSSConfig('dogecloud', 'my-bucket');
    await setupDefaultOSS(config);
  }

  async getUpdate(runtimeVersion: string) {
    // 使用封装好的函数，更简洁
    return await getLatestUpdateBundlePathForRuntimeVersionAsync(runtimeVersion);
  }
}
```

## 最佳实践

### 1. 环境配置

```typescript
// 推荐的配置方式
function createOSSConfigFromEnv(): OSSConfig {
  const provider = process.env.OSS_PROVIDER || 'dogecloud';
  const bucket = process.env.OSS_BUCKET || 'default-bucket';

  switch (provider) {
    case 'dogecloud':
      return createOSSConfig('dogecloud', bucket, {
        accessKey: process.env.DOGE_CLOUD_ACCESS_KEY,
        secretKey: process.env.DOGE_CLOUD_SECRET_KEY,
      });
    case 's3':
      return createOSSConfig('s3', bucket, {
        region: process.env.AWS_REGION,
        accessKey: process.env.AWS_ACCESS_KEY_ID,
        secretKey: process.env.AWS_SECRET_ACCESS_KEY,
      });
    default:
      throw new Error(`Unsupported OSS provider: ${provider}`);
  }
}
```

### 2. 错误处理

```typescript
async function safeOSSOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    console.error('OSS operation failed:', error);
    if (fallback !== undefined) {
      return fallback;
    }
    // 重新抛出错误或返回 undefined
    throw error;
  }
}

// 使用示例
const exists = await safeOSSOperation(
  () => fileExistsAsync('some-file.txt'),
  false // 出错时默认为 false
);
```

### 3. 性能优化

```typescript
// 使用批量操作而不是单个操作
async function optimizedUpload(files: { [key: string]: Buffer }) {
  // 并行上传，但限制并发数
  const concurrency = 5;
  const chunks = Object.entries(files).reduce((acc, [key, buffer], index) => {
    const chunkIndex = Math.floor(index / concurrency);
    if (!acc[chunkIndex]) acc[chunkIndex] = [];
    acc[chunkIndex].push([key, buffer]);
    return acc;
  }, [] as Array<Array<[string, Buffer]>>);

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(([key, buffer]) => uploadFileAsync(key, buffer))
    );
  }
}
```

### 4. 测试

```typescript
// 创建测试专用的 OSS 管理器
function createTestOSSManager(): OSSManager {
  const config = createOSSConfig('dogecloud', 'test-bucket', {
    accessKey: 'test-key',
    secretKey: 'test-secret',
  });
  return new OSSManager(config);
}

// 在测试中使用独立的实例
test('should upload file', async () => {
  const testManager = createTestOSSManager();
  await testManager.initialize();
  
  await uploadFileAsync(
    'test-file.txt',
    Buffer.from('test content'),
    'text/plain',
    testManager.getProvider()
  );
  
  const exists = await fileExistsAsync(
    'test-file.txt',
    testManager.getProvider()
  );
  expect(exists).toBe(true);
});
```

## 故障排除

### 常见问题

#### 1. "Default OSS not configured" 错误

**原因**: 没有调用 `setupDefaultOSS()` 初始化默认 OSS。

**解决方案**:
```typescript
const config = createOSSConfig('dogecloud', 'your-bucket');
await setupDefaultOSS(config);
```

#### 2. "access key and secret key are required" 错误

**原因**: 缺少必要的认证信息。

**解决方案**:
- 检查环境变量是否正确设置
- 或在配置中明确指定 accessKey 和 secretKey

#### 3. "Unsupported OSS provider" 错误

**原因**: 尝试使用未注册的 OSS 提供商。

**解决方案**:
```typescript
// 检查可用的提供商
const factory = OSSProviderFactory.getInstance();
console.log('Available providers:', factory.getAvailableProviders());

// 或注册自定义提供商
factory.registerProvider('mycustom', MyCustomAdapter);
```

#### 4. 网络连接错误

**原因**: 网络问题或端点配置错误。

**解决方案**:
- 检查网络连接
- 验证端点 URL 是否正确
- 检查防火墙设置

### 调试技巧

#### 1. 启用详细日志

```typescript
// 在开发环境启用详细日志
if (process.env.NODE_ENV === 'development') {
  console.log('OSS Config:', JSON.stringify(config, null, 2));
}
```

#### 2. 测试连接

```typescript
async function testOSSConnection() {
  try {
    const provider = getDefaultOSS().getProvider();
    const bucketName = provider.getBucketName();
    
    // 尝试列出根目录
    const result = await provider.listObjects({
      Bucket: bucketName,
      MaxKeys: 1,
    });
    
    console.log('OSS connection successful');
    return true;
  } catch (error) {
    console.error('OSS connection failed:', error);
    return false;
  }
}
```

#### 3. 验证配置

```typescript
function validateOSSConfig(config: OSSConfig): void {
  if (!config.bucket) {
    throw new Error('Bucket name is required');
  }
  
  if (config.provider === 'dogecloud') {
    if (!config.accessKey && !process.env.DOGE_CLOUD_ACCESS_KEY) {
      throw new Error('DogeCloud access key is required');
    }
  }
  
  // 添加其他验证逻辑...
}
```

## 总结

新的 OSS 适配器系统提供了更好的可扩展性、类型安全性和易用性。通过遵循本指南，您应该能够：

1. 快速设置和配置 OSS 适配器
2. 从旧系统平滑迁移到新系统
3. 创建自定义适配器支持新的存储服务
4. 处理常见问题和进行故障排除

如果您遇到任何问题或需要更多帮助，请查看源代码中的注释和测试文件，或提交 issue。