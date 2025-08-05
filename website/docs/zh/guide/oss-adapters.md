# OSS 适配器系统

Bun Expo Updates Server 提供了一个灵活的对象存储服务 (OSS) 适配器系统，用于管理更新文件的存储和分发。本页面将详细介绍如何配置和使用这些适配器。

## OSS 适配器概述

OSS 适配器系统允许服务器与各种云存储提供商集成，包括：

- **DogeCloud**：多吉云对象存储
- **七牛云**：七牛云存储
- **AWS S3**：亚马逊 S3 或兼容 S3 协议的存储服务
- **自定义适配器**：您可以实现自己的存储提供商适配器

这种灵活的架构使您可以选择最适合您需求和地区的存储服务。

## 快速开始

### 1. 创建配置文件

首先，您需要设置 OSS 提供商的配置：

```typescript
// src/config/oss-config.ts
import { OSSConfig } from '../utils/oss-provider/types';

export const dogecloudConfig: OSSConfig = {
  provider: 'dogecloud',
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key'
};
```

### 2. 设置环境变量

或者，您可以使用环境变量进行配置：

```bash
# 基本 OSS 配置
OSS_PROVIDER=dogecloud
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key

# 根据提供商可能需要额外配置
OSS_REGION=your_region
OSS_BUCKET=your_bucket_name
OSS_ENDPOINT=your_endpoint_url  # S3或自定义提供商需要
OSS_FORCE_PATH_STYLE=0  # 可选：强制路径样式 (1 表示是，0 表示否)
```

### 3. 初始化并使用 OSS

```typescript
import { getOSSProvider } from '../utils/oss-provider/factory';

async function initApp() {
  try {
    // 初始化 OSS 提供商
    const ossProvider = await getOSSProvider();
    
    // 检查是否成功初始化
    if (!ossProvider) {
      console.error('无法初始化 OSS 提供商');
      return;
    }
    
    console.log(`成功初始化 ${ossProvider.getBucketName()} OSS 提供商`);
    
    // 现在您可以使用 ossProvider 进行文件操作
  } catch (error) {
    console.error('初始化 OSS 时出错:', error);
  }
}
```

## 支持的提供商配置

### DogeCloud 配置

```typescript
// 配置文件方式
const dogecloudConfig = {
  provider: 'dogecloud',
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key'
};

// 环境变量方式
// OSS_PROVIDER=dogecloud
// OSS_ACCESS_KEY=your_access_key
// OSS_SECRET_KEY=your_secret_key
```

### 七牛云配置

```typescript
const qiniuConfig = {
  provider: 'qiniu',
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key',
  region: 'your_region',
  bucket: 'your_bucket'
};

// 环境变量方式
// OSS_PROVIDER=qiniu
// OSS_ACCESS_KEY=your_access_key
// OSS_SECRET_KEY=your_secret_key
// OSS_REGION=your_region
// OSS_BUCKET=your_bucket
```

### AWS S3 配置

```typescript
const s3Config = {
  provider: 's3',
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key',
  region: 'your_region',
  bucket: 'your_bucket',
  endpoint: 'your_endpoint',
  forcePathStyle: false // 可选，默认为 false
};

// 环境变量方式
// OSS_PROVIDER=s3
// OSS_ACCESS_KEY=your_access_key
// OSS_SECRET_KEY=your_secret_key
// OSS_REGION=your_region
// OSS_BUCKET=your_bucket
// OSS_ENDPOINT=your_endpoint
// OSS_FORCE_PATH_STYLE=0
```

## OSS 操作指南

### 文件上传

```typescript
async function uploadFile(ossProvider, localFilePath, ossFilePath) {
  try {
    // 读取本地文件
    const fileContent = await Bun.file(localFilePath).arrayBuffer();
    const content = new Uint8Array(fileContent);
    
    // 确定 MIME 类型
    const mimeType = getMimeType(localFilePath);
    
    // 上传到 OSS
    await ossProvider.putObject({
      key: ossFilePath,
      body: content,
      contentType: mimeType
    });
    
    console.log(`成功上传 ${localFilePath} 到 ${ossFilePath}`);
  } catch (error) {
    console.error(`上传文件失败: ${error.message}`);
  }
}
```

### 文件下载

```typescript
async function downloadFile(ossProvider, ossFilePath, localFilePath) {
  try {
    // 从 OSS 获取文件
    const result = await ossProvider.getObject({ key: ossFilePath });
    
    // 将文件内容写入本地文件
    await Bun.write(localFilePath, result.body);
    
    console.log(`成功下载 ${ossFilePath} 到 ${localFilePath}`);
  } catch (error) {
    console.error(`下载文件失败: ${error.message}`);
  }
}
```

### 列出文件

```typescript
async function listFiles(ossProvider, prefix) {
  try {
    // 列出具有特定前缀的对象
    const result = await ossProvider.listObjects({ prefix });
    
    console.log(`找到 ${result.Contents.length} 个对象，前缀为 "${prefix}"`);
    
    // 处理结果
    for (const object of result.Contents) {
      console.log(`- ${object.Key} (大小: ${object.Size} 字节)`);
    }
  } catch (error) {
    console.error(`列出文件失败: ${error.message}`);
  }
}
```

### 删除文件

```typescript
async function deleteFile(ossProvider, ossFilePath) {
  try {
    // 删除文件
    await ossProvider.deleteObject({ key: ossFilePath });
    
    console.log(`成功删除 ${ossFilePath}`);
  } catch (error) {
    console.error(`删除文件失败: ${error.message}`);
  }
}
```

## 创建自定义适配器

如果您需要集成不直接支持的存储提供商，可以创建自定义适配器：

### 1. 实现适配器接口

```typescript
import { OSSAdapter, OSSConfig, PutObjectParams, GetObjectParams, HeadObjectParams } from '../utils/oss-provider/types';

class CustomOSSAdapter implements OSSAdapter {
  private config: OSSConfig;
  private client: any; // 您的存储客户端实例

  constructor(config: OSSConfig) {
    this.config = config;
    
    // 初始化您的存储客户端
    this.client = new YourStorageClient({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      // 其他配置...
    });
  }

  getBucketName(): string {
    return this.config.bucket || 'default-bucket';
  }

  async listObjects(params: { prefix?: string }): Promise<any> {
    // 实现列出对象的逻辑
    const result = await this.client.listObjects({
      bucket: this.getBucketName(),
      prefix: params.prefix || ''
    });
    
    return {
      Contents: result.objects.map(obj => ({
        Key: obj.key,
        Size: obj.size
      }))
    };
  }

  async getObject(params: GetObjectParams): Promise<any> {
    // 实现获取对象的逻辑
    const result = await this.client.getObject({
      bucket: this.getBucketName(),
      key: params.key
    });
    
    return {
      body: result.content,
      contentType: result.contentType
    };
  }

  async putObject(params: PutObjectParams): Promise<void> {
    // 实现上传对象的逻辑
    await this.client.putObject({
      bucket: this.getBucketName(),
      key: params.key,
      content: params.body,
      contentType: params.contentType
    });
  }

  async deleteObject(params: { key: string }): Promise<void> {
    // 实现删除对象的逻辑
    await this.client.deleteObject({
      bucket: this.getBucketName(),
      key: params.key
    });
  }

  async headObject(params: HeadObjectParams): Promise<any> {
    // 实现检查对象的逻辑
    const result = await this.client.headObject({
      bucket: this.getBucketName(),
      key: params.key
    });
    
    return {
      ContentType: result.contentType,
      ContentLength: result.contentLength
    };
  }

  async generatePresignedUrl(params: { key: string; expires?: number }): Promise<string> {
    // 实现生成预签名 URL 的逻辑
    return this.client.generatePresignedUrl({
      bucket: this.getBucketName(),
      key: params.key,
      expires: params.expires || 3600
    });
  }
}
```

### 2. 注册自定义适配器

修改工厂文件以包含您的自定义适配器：

```typescript
// src/utils/oss-provider/factory.ts
import { OSSAdapter, OSSConfig } from './types';
import { DogeCloudAdapter } from './dogecloud-adapter';
import { S3Adapter } from './s3-adapter';
import { CustomOSSAdapter } from './custom-adapter';

export function createOSSAdapter(config: OSSConfig): OSSAdapter {
  switch (config.provider) {
    case 'dogecloud':
      return new DogeCloudAdapter(config);
    case 's3':
      return new S3Adapter(config);
    case 'custom':
      return new CustomOSSAdapter(config);
    default:
      throw new Error(`不支持的 OSS 提供商: ${config.provider}`);
  }
}
```

## 最佳实践

### 性能优化

1. **批量操作**：对于多个小文件，使用批量操作而不是单独请求
2. **合理的超时设置**：为不同的操作配置适当的超时时间
3. **区域选择**：选择靠近您用户的存储区域
4. **缓存策略**：为静态资产设置适当的缓存头

### 安全建议

1. **最小权限原则**：OSS 访问密钥应仅具有必要的权限
2. **密钥轮换**：定期更换访问密钥
3. **HTTPS**：确保所有 OSS 访问使用 HTTPS
4. **环境变量**：使用环境变量而不是硬编码配置
5. **审计日志**：启用 OSS 访问日志进行监控

### 错误处理

在使用 OSS 适配器时实施健壮的错误处理：

```typescript
async function safeOSSOperation(operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    console.error(`OSS 操作失败: ${error.message}`);
    
    // 根据错误类型实施不同的重试策略
    if (error.code === 'NetworkError') {
      // 网络错误重试
      return await retryWithBackoff(operation);
    }
    
    // 如果提供了回退值，则返回
    if (fallback !== undefined) {
      return fallback;
    }
    
    // 重新抛出错误以由调用者处理
    throw error;
  }
}
```

## 故障排除

### 常见问题和解决方案

1. **连接超时**
   - 检查网络连接
   - 验证端点是否正确
   - 检查防火墙规则

2. **访问被拒绝错误**
   - 验证访问密钥和密钥
   - 检查存储桶策略和权限
   - 确认存储桶名称正确

3. **"找不到文件"错误**
   - 验证文件路径和前缀
   - 检查大小写（许多 OSS 提供商区分大小写）
   - 确认文件是否已成功上传

4. **MIME 类型问题**
   - 使用 `getMimeType` 工具函数确保正确的内容类型
   - 对于特殊文件类型，显式设置内容类型

### 调试技巧

1. **启用详细日志记录**：
   ```bash
   DEBUG=true LOG_LANGUAGE=zh-CN bun run dev
   ```

2. **检查 OSS 提供商状态**：
   - 访问提供商的状态页面
   - 检查服务中断公告

3. **测试连接**：
   ```typescript
   async function testOSSConnection(ossProvider) {
     try {
       // 尝试列出一个对象来测试连接
       await ossProvider.listObjects({ prefix: '', maxKeys: 1 });
       console.log('OSS 连接测试成功!');
       return true;
     } catch (error) {
       console.error('OSS 连接测试失败:', error.message);
       return false;
     }
   }
   ```

## 扩展阅读

- [完整的 OSS 适配器 API 参考](/zh/guide/api#oss-adapters)
- [对象存储最佳实践](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [DogeCloud 官方文档](https://docs.dogecloud.com/oss)
- [七牛云开发者文档](https://developer.qiniu.com/kodo)
- [AWS S3 开发者指南](https://docs.aws.amazon.com/AmazonS3/latest/dev/Welcome.html)