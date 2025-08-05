# OSS 适配器系统使用指南

[English Version](#english-version) | 中文版

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
  - [1. 创建配置文件](#1-创建配置文件)
  - [2. 设置环境变量](#2-设置环境变量)
  - [3. 初始化 OSS](#3-初始化-oss)
  - [4. 使用 OSS 功能](#4-使用-oss-功能)
- [配置说明](#配置说明)
  - [DogeCloud 配置](#dogecloud-配置)
  - [AWS S3 配置](#aws-s3-配置)
  - [其他云存储配置](#其他云存储配置)
- [基本使用](#基本使用)
  - [初始化和配置](#初始化和配置)
  - [文件操作](#文件操作)
  - [更新包管理](#更新包管理)
- [高级功能](#高级功能)
  - [多实例使用](#多实例使用)
  - [预签名 URL](#预签名-url)
  - [批量操作](#批量操作)
- [自定义适配器](#自定义适配器)
  - [创建自定义适配器](#创建自定义适配器)
  - [注册自定义适配器](#注册自定义适配器)
- [最佳实践](#最佳实践)
  - [环境配置](#环境配置)
  - [错误处理](#错误处理)
- [故障排除](#故障排除)
  - [常见问题](#常见问题)
  - [调试技巧](#调试技巧)
- [总结](#总结)

## 概述

OSS 适配器系统提供了统一的接口来访问各种对象存储服务（Object Storage Service, OSS），包括多吉云、AWS S3、阿里云 OSS、七牛云、腾讯云 COS 等。系统使用工厂模式和适配器模式，使开发者能够以一致的方式与不同的存储服务交互。

该系统是自定义 Expo 更新服务器的核心组件，负责存储和管理应用更新包。

## 快速开始

### 1. 创建配置文件

首先，从示例文件创建配置文件：

```bash
# 复制示例配置文件
cp src/config/oss-config.example.ts src/config/oss-config.ts

# 根据需要编辑配置文件
vim src/config/oss-config.ts
```

### 2. 设置环境变量

在项目根目录创建或编辑 `.env` 文件，配置 OSS 相关的环境变量：

```bash
# 选择 OSS 提供商（dogecloud、s3、aliyun、qiniu、tencent）
OSS_PROVIDER=dogecloud

# OSS 访问凭证
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key

# 可选配置
OSS_REGION=your_region
OSS_BUCKET=your_bucket_name
OSS_ENDPOINT=your_endpoint_url
OSS_FORCE_PATH_STYLE=0  # 0表示false，1表示true
```

### 3. 初始化 OSS

在应用启动时初始化 OSS：

```typescript
import { initializeOSS } from "./config/oss-config";

async function initApp() {
  try {
    // 初始化 OSS 配置
    await initializeOSS();
    
    // 启动应用服务器
    console.log("OSS initialized successfully, starting server...");
    // 其他初始化代码...
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
}

initApp();
```

### 4. 使用 OSS 功能

初始化完成后，可以通过 OSS 管理器执行各种操作：

```typescript
import { getDefaultOSSManager } from "./utils/oss-provider/factory";

async function getLatestUpdate(platform: string, runtimeVersion: string) {
  const ossManager = getDefaultOSSManager();
  
  // 获取最新更新包的路径
  const latestPath = `updates/${platform}/${runtimeVersion}/latest`;
  
  // 检查是否存在
  const exists = await ossManager.objectExists(latestPath);
  if (!exists) {
    return null;
  }
  
  // 获取元数据
  const metadata = await ossManager.getObjectMetadata(latestPath);
  
  return {
    path: latestPath,
    updateId: metadata.updateId,
    createdAt: metadata.createdAt
  };
}
```

## 配置说明

项目使用 `src/config/oss-config.ts` 文件进行 OSS 配置。以下是各种提供商的配置示例。

### DogeCloud 配置

```typescript
// DogeCloud 配置
export const dogecloudConfig: OSSConfig = {
  provider: "dogecloud",
  accessKey: process.env.OSS_ACCESS_KEY,
  secretKey: process.env.OSS_SECRET_KEY,
  region: process.env.OSS_REGION || "automatic",
  forcePathStyle: Boolean(Number(process.env.OSS_FORCE_PATH_STYLE)),
};
```

### AWS S3 配置

```typescript
// AWS S3 配置
export const awsS3Config: OSSConfig = {
  provider: "s3",
  bucket: process.env.OSS_BUCKET || "your-s3-bucket",
  region: process.env.OSS_REGION || "us-east-1",
  accessKey: process.env.OSS_ACCESS_KEY,
  secretKey: process.env.OSS_SECRET_KEY,
};
```

### 其他云存储配置

项目也支持配置其他云存储服务，如阿里云 OSS、七牛云、腾讯云 COS 等。详见 `oss-config.example.ts` 文件中的示例。

自动选择配置的函数示例：

```typescript
// 根据环境变量选择配置
export function getOSSConfig(): OSSConfig {
  const provider = process.env.OSS_PROVIDER || "dogecloud";

  switch (provider.toLowerCase()) {
    case "dogecloud":
      return dogecloudConfig;
    case "aliyun":
      return aliyunOSSConfig;
    case "s3":
    case "aws":
      return awsS3Config;
    case "qiniu":
      return qiniuConfig;
    case "tencent":
    case "cos":
      return tencentCOSConfig;
    default:
      throw new Error(`Unsupported OSS provider: ${provider}`);
  }
}
```

## 基本使用

### 初始化和配置

在您的代码中初始化和使用 OSS 系统的典型流程：

```typescript
import { setupDefaultOSS, getDefaultOSSManager } from "./utils/oss-provider/factory";
import { getOSSConfig } from "./config/oss-config";

async function initializeStorage() {
  // 获取配置
  const config = getOSSConfig();
  
  // 初始化默认 OSS 实例
  await setupDefaultOSS(config);
  
  // 获取 OSS 管理器
  const ossManager = getDefaultOSSManager();
  
  return ossManager;
}
```

### 文件操作

基本文件操作示例：

```typescript
async function fileOperations() {
  const ossManager = getDefaultOSSManager();
  
  // 检查文件是否存在
  const exists = await ossManager.objectExists("path/to/file.json");
  console.log(`File exists: ${exists}`);
  
  // 上传文件
  const content = JSON.stringify({ key: "value" });
  await ossManager.putObject("path/to/newfile.json", content, {
    contentType: "application/json",
    metadata: { createdAt: new Date().toISOString() }
  });
  
  // 下载文件
  const data = await ossManager.getObject("path/to/newfile.json");
  console.log("File content:", data);
  
  // 删除文件
  await ossManager.deleteObject("path/to/oldfile.json");
}
```

### 更新包管理

处理 Expo 更新包的示例：

```typescript
async function manageUpdates(platform: string, runtimeVersion: string, updateId: string) {
  const ossManager = getDefaultOSSManager();
  
  // 获取最新更新路径
  const latestPath = `updates/${platform}/${runtimeVersion}/latest`;
  
  // 设置更新元数据
  const metadata = {
    updateId,
    platform,
    runtimeVersion,
    createdAt: new Date().toISOString()
  };
  
  // 存储 Expo 配置
  const expoConfig = {
    name: "MyApp",
    slug: "my-app",
    version: "1.0.0",
    // 其他配置...
  };
  
  // 上传更新信息
  await ossManager.putObject(latestPath, JSON.stringify(metadata), {
    contentType: "application/json",
    metadata
  });
  
  // 上传配置
  await ossManager.putObject(
    `updates/${platform}/${runtimeVersion}/${updateId}/expo-config.json`, 
    JSON.stringify(expoConfig),
    { contentType: "application/json" }
  );
  
  console.log(`Update ${updateId} published for ${platform} (${runtimeVersion})`);
}
```

## 高级功能

### 多实例使用

您可以创建和使用多个 OSS 实例，适用于不同的环境或服务：

```typescript
import { createOSSManager } from "./utils/oss-provider/factory";
import { getOSSConfig, envConfigs } from "./config/oss-config";

async function setupMultipleInstances() {
  // 创建生产环境实例
  const productionOSS = await createOSSManager(envConfigs.production);
  
  // 创建测试环境实例
  const stagingOSS = await createOSSManager(envConfigs.staging);
  
  // 使用生产实例
  const prodPath = "production/updates/latest";
  await productionOSS.putObject(prodPath, "production data", {
    contentType: "text/plain",
    metadata: { environment: "production" }
  });
  
  // 使用测试实例
  const stagingPath = "staging/updates/latest";
  await stagingOSS.putObject(stagingPath, "staging data", {
    contentType: "text/plain",
    metadata: { environment: "staging" }
  });
}
```

### 预签名 URL

生成预签名 URL，用于临时访问或上传文件：

```typescript
async function generateDownloadLink(path: string, expiresInSeconds = 3600) {
  const ossManager = getDefaultOSSManager();
  
  // 生成临时下载链接
  const url = await ossManager.generatePresignedUrl(path, {
    expires: expiresInSeconds,
    operation: "getObject"
  });
  
  return url;
}

async function generateUploadLink(path: string, expiresInSeconds = 3600) {
  const ossManager = getDefaultOSSManager();
  
  // 生成临时上传链接
  const url = await ossManager.generatePresignedUrl(path, {
    expires: expiresInSeconds,
    operation: "putObject",
    contentType: "application/octet-stream"
  });
  
  return url;
}
```

### 批量操作

执行批量文件操作：

```typescript
// 批量上传文件
async function batchUpload(files: Array<{ path: string, content: string | Buffer }>) {
  const ossManager = getDefaultOSSManager();
  const results = [];
  
  for (const file of files) {
    try {
      await ossManager.putObject(file.path, file.content);
      results.push({ path: file.path, success: true });
    } catch (error) {
      console.error(`Failed to upload ${file.path}:`, error);
      results.push({ path: file.path, success: false, error });
    }
  }
  
  return results;
}

// 批量删除文件
async function batchDelete(paths: string[]) {
  const ossManager = getDefaultOSSManager();
  const results = [];
  
  for (const path of paths) {
    try {
      await ossManager.deleteObject(path);
      results.push({ path, success: true });
    } catch (error) {
      results.push({ path, success: false, error });
    }
  }
  
  return results;
}
```

## 自定义适配器

### 创建自定义适配器

您可以创建自定义适配器来支持其他对象存储服务：

```typescript
import { OSSAdapter, OSSConfig } from "./utils/oss-provider/types";

// 自定义适配器实现示例
class MyCustomOSSAdapter implements OSSAdapter {
  private config: OSSConfig;
  private client: any; // 您的存储服务 SDK 客户端
  
  constructor(config: OSSConfig) {
    this.config = config;
    
    // 初始化客户端
    this.client = new YourStorageSDK({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      endpoint: config.endpoint,
      region: config.region,
      bucket: config.bucket
    });
  }
  
  getBucketName(): string {
    return this.config.bucket || "default-bucket";
  }
  
  async listObjects(prefix?: string): Promise<string[]> {
    try {
      const response = await this.client.list({
        prefix,
        bucket: this.getBucketName()
      });
      
      return response.objects.map((obj: any) => obj.key);
    } catch (error) {
      console.error("Failed to list objects:", error);
      throw new Error(`List objects failed: ${error.message}`);
    }
  }
  
  async getObject(key: string): Promise<Buffer> {
    try {
      const response = await this.client.get(key, {
        bucket: this.getBucketName()
      });
      
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Get object failed: ${error.message}`);
    }
  }
  
  async putObject(key: string, data: Buffer | string, options?: any): Promise<void> {
    try {
      await this.client.put(key, data, {
        bucket: this.getBucketName(),
        contentType: options?.contentType,
        metadata: options?.metadata
      });
    } catch (error) {
      throw new Error(`Put object failed: ${error.message}`);
    }
  }
  
  async deleteObject(key: string): Promise<void> {
    await this.client.delete(key, { bucket: this.getBucketName() });
  }
  
  async headObject(key: string): Promise<any> {
    try {
      const response = await this.client.head(key, {
        bucket: this.getBucketName()
      });
      
      return {
        contentLength: response.size,
        contentType: response.contentType,
        metadata: response.metadata
      };
    } catch (error) {
      throw new Error(`Head object failed: ${error.message}`);
    }
  }
  
  async generatePresignedUrl(key: string, options?: any): Promise<string> {
    return this.client.signUrl(key, {
      expires: options?.expires || 3600,
      operation: options?.operation || "getObject",
      bucket: this.getBucketName()
    });
  }
}
```

### 注册自定义适配器

注册自定义适配器并使用：

```typescript
import { registerOSSAdapter, createOSSManager } from "./utils/oss-provider/factory";
import { MyCustomOSSAdapter } from "./utils/oss-provider/my-custom-adapter";

// 注册自定义适配器
registerOSSAdapter("mycustom", MyCustomOSSAdapter);

// 创建使用自定义适配器的实例
async function useCustomAdapter() {
  const factory = getOSSFactory();
  
  // 自定义配置
  const config = {
    provider: "mycustom", // 使用注册的自定义适配器名称
    accessKey: "your-access-key",
    secretKey: "your-secret-key",
    endpoint: "https://storage.example.com",
    bucket: "my-custom-bucket"
  };
  
  // 创建实例
  const customOSS = await createOSSManager(config);
  
  // 使用实例
  await customOSS.putObject("test-file.txt", "Hello from custom OSS!");
}
```

## 最佳实践

### 环境配置

从环境变量创建配置的最佳实践：

```typescript
function createOSSConfigFromEnv(): OSSConfig {
  const provider = process.env.OSS_PROVIDER || "dogecloud";
  
  // 基本配置
  const config: OSSConfig = {
    provider,
    accessKey: process.env.OSS_ACCESS_KEY,
    secretKey: process.env.OSS_SECRET_KEY,
  };
  
  // 根据不同提供商添加特定配置
  if (process.env.OSS_BUCKET) {
    config.bucket = process.env.OSS_BUCKET;
  }
  
  if (process.env.OSS_REGION) {
    config.region = process.env.OSS_REGION;
  }
  
  if (process.env.OSS_ENDPOINT) {
    config.endpoint = process.env.OSS_ENDPOINT;
  }
  
  if (process.env.OSS_FORCE_PATH_STYLE) {
    config.forcePathStyle = Boolean(Number(process.env.OSS_FORCE_PATH_STYLE));
  }
  
  return config;
}
```

### 错误处理

处理 OSS 操作错误的最佳实践：

```typescript
async function safeOSSOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = "OSS operation failed"
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // 检查网络错误
    if (error.code === "ECONNREFUSED" || error.code === "NetworkingError") {
      console.error("OSS connection error:", error);
      throw new Error(`${errorMessage}: Connection failed - please check your network and OSS endpoint`);
    }
    
    // 检查认证错误
    if (error.code === "AccessDenied" || error.code === "InvalidAccessKeyId") {
      console.error("OSS authentication error:", error);
      throw new Error(`${errorMessage}: Authentication failed - check your access credentials`);
    }
    
    // 其他错误
    console.error("OSS error:", error);
    throw new Error(`${errorMessage}: ${error.message}`);
  }
}

// 使用安全操作
async function checkFileExists(path: string): Promise<boolean> {
  const ossManager = getDefaultOSSManager();
  
  return await safeOSSOperation(
    () => ossManager.objectExists(path),
    `Failed to check if ${path} exists`
  );
}
```

## 故障排除

### 常见问题

#### 1. "Default OSS not configured" 错误

如果遇到 "Default OSS not configured" 错误，表示您尚未初始化默认的 OSS 实例。确保在使用 OSS 功能前调用 `initializeOSS()` 或 `setupDefaultOSS()`。

解决方案：

```typescript
import { setupDefaultOSS } from "./utils/oss-provider/factory";
import { getOSSConfig } from "./config/oss-config";

// 在应用启动时调用
const config = getOSSConfig();
await setupDefaultOSS(config);
```

#### 2. "access key and secret key are required" 错误

确保在环境变量或配置文件中提供了访问凭证：

```
OSS_ACCESS_KEY=your-access-key-here
OSS_SECRET_KEY=your-secret-key-here
```

或在配置中直接设置（不推荐在生产环境中这样做）：

```typescript
const config: OSSConfig = {
  provider: "dogecloud",
  accessKey: "your-access-key-here",
  secretKey: "your-secret-key-here",
  // 其他配置...
};
```

#### 3. "Unsupported OSS provider" 错误

检查 `OSS_PROVIDER` 环境变量是否设置为受支持的值，或确保您已注册了自定义适配器：

```typescript
import { registerOSSAdapter } from "./utils/oss-provider/factory";
import { MyCustomAdapter } from "./path/to/my-adapter";

// 注册自定义适配器
const factory = getOSSFactory();
factory.registerAdapter("mycustom", MyCustomAdapter);

// 然后使用该适配器
const config = {
  provider: "mycustom",
  // 其他配置...
};
```

#### 4. 网络连接错误

如果遇到网络连接问题，请检查：

- OSS 端点是否正确
- 网络连接是否正常
- 防火墙规则是否允许连接

```typescript
// 检查连接设置
console.log("Current OSS config:", {
  provider: process.env.OSS_PROVIDER,
  endpoint: process.env.OSS_ENDPOINT,
  region: process.env.OSS_REGION
});
```

### 调试技巧

#### 1. 启用详细日志

通过设置环境变量启用详细日志记录：

```bash
DEBUG=true
LOG_LEVEL=debug
```

在代码中使用详细日志：

```typescript
import { logger } from "./utils/logger";

logger.debug("OSS operation details:", { operation: "putObject", key, metadata });
```

#### 2. 测试连接

使用测试脚本验证 OSS 连接：

```typescript
async function testOSSConnection() {
  try {
    const config = getOSSConfig();
    console.log("Testing connection with config:", {
      provider: config.provider,
      region: config.region,
      endpoint: config.endpoint,
      bucket: config.bucket
    });
    
    const ossManager = await createOSSManager(config);
    
    // 尝试列出对象
    console.log("Listing objects with prefix 'test/'...");
    const objects = await ossManager.listObjects("test/");
    console.log("Connection successful! Found objects:", objects.length);
    
    // 尝试上传测试文件
    console.log("Uploading test file...");
    await ossManager.putObject("test/connection-test.txt", "Connection test successful");
    console.log("Test file upload successful!");
    
    return true;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}
```

#### 3. 验证配置

验证 OSS 配置是否完整和有效：

```typescript
function validateOSSConfig(config: OSSConfig): { valid: boolean; errors: string[] } {
  const errors = [];
  
  if (!config.provider) {
    errors.push("Provider is required");
  }
  
  if (!config.accessKey) {
    errors.push("Access key is required");
  }
  
  if (!config.secretKey) {
    errors.push("Secret key is required");
  }
  
  // 根据提供商验证特定配置
  if (["s3", "aliyun", "qiniu", "tencent"].includes(config.provider)) {
    if (!config.bucket) {
      errors.push(`Bucket is required for ${config.provider}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## 总结

本指南介绍了 OSS 适配器系统的使用方法，从基本配置到高级功能。通过遵循这些实践，您可以高效地将各种对象存储服务集成到您的 Expo 更新服务器中。

系统的主要优点包括：
- 统一的接口访问不同的存储服务
- 灵活的配置选项
- 支持多种云存储提供商
- 可扩展的适配器架构

如果您在使用过程中遇到问题，请参考故障排除部分或查看源代码以了解更多详情。

---

# English Version

# OSS Adapter System Usage Guide

[English Version](#english-version) | [中文版](#oss-适配器系统使用指南)

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Basic Usage](#basic-usage)
- [Advanced Features](#advanced-features)
- [Custom Adapters](#custom-adapters)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Conclusion](#conclusion)

## Overview

The OSS adapter system provides a unified interface to access various Object Storage Services (OSS), including DogeCloud, AWS S3, Aliyun OSS, Qiniu Cloud, and Tencent COS. The system uses the factory and adapter patterns, allowing developers to interact with different storage services consistently.

This system is a core component of the custom Expo update server, responsible for storing and managing application update packages.

## Quick Start

1. Create a configuration file by copying the example
2. Set up environment variables
3. Initialize OSS at application startup
4. Use OSS functionality for file operations

For detailed instructions, see the Chinese version above.

## Configuration

The project uses `src/config/oss-config.ts` for OSS configuration. Examples for various providers are available in the `oss-config.example.ts` file.

## Basic Usage

After initialization, you can perform various operations through the OSS manager:
- File operations (upload, download, check existence)
- Update package management
- Metadata handling

## Advanced Features

The system supports advanced features such as:
- Multiple OSS instances
- Presigned URLs
- Batch operations

## Custom Adapters

You can create and register custom adapters to support additional storage services.

## Best Practices

Follow best practices for:
- Environment configuration
- Error handling
- Performance optimization

## Troubleshooting

Common issues and debugging tips are provided in the Chinese version.

## Conclusion

This guide has introduced the OSS adapter system usage, from basic configuration to advanced features. By following these practices, you can efficiently integrate various object storage services into your Expo update server.