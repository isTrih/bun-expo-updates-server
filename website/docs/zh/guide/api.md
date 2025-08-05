# API 参考

本页面提供 Bun Expo Updates Server 的 API 端点详细说明和使用方法。

## 服务器 API 概述

Bun Expo Updates Server 提供了一组符合 Expo Updates 协议的 API 端点，使 Expo 客户端应用能够检查、下载和应用更新。

## 主要 API 端点

### 获取更新清单

```
GET /api/manifest
```

此端点处理来自 Expo 客户端的更新请求，并返回适当的更新清单或指令。

#### 请求头

| 头部参数 | 描述 | 示例值 |
|---------|------|--------|
| `expo-protocol-version` | Expo Updates 协议版本 | `0` 或 `1` |
| `expo-platform` | 请求更新的平台 | `ios` 或 `android` |
| `expo-runtime-version` | 客户端应用的运行时版本 | `1.0.0` |
| `expo-current-update-id` | 当前安装的更新 ID | `abc123` |
| `expo-embedded-update-id` | 应用内嵌的更新 ID | `xyz789` |
| `expo-expect-signature` | 是否期望对响应进行签名 | `true` |

#### 响应

根据请求的情况和服务器的配置，此端点可能返回以下响应类型之一：

**1. 有可用更新**

响应类型：`multipart/mixed`

```
--expo-multipart-boundary
Content-Type: application/json

{
  "manifestFilename": "manifest.json",
  "type": "practical-dilithium-duckling"
}
--expo-multipart-boundary
Content-Type: application/json
Content-Disposition: attachment; filename=manifest.json

{
  "id": "unique-update-id",
  "createdAt": "2023-10-30T12:00:00.000Z",
  "runtimeVersion": "1.0.0",
  "assets": [
    {
      "hash": "asset-hash-1",
      "key": "assets/image.png",
      "fileExtension": ".png",
      "contentType": "image/png",
      "url": "https://your-domain.com/updates/1.0.0/latest/assets/image.png"
    }
  ],
  "launchAsset": {
    "hash": "bundle-hash",
    "key": "bundles/ios-abcdef.js",
    "contentType": "application/javascript",
    "url": "https://your-domain.com/updates/1.0.0/latest/bundles/ios-abcdef.js"
  },
  "metadata": {},
  "extra": {
    "expoClient": {
      // 额外的客户端配置
    }
  }
}
--expo-multipart-boundary--
```

**2. 无可用更新**

响应类型：`application/json`

```json
{
  "manifestString": "{\"manifestFilename\":\"noupdate\",\"type\":\"no-update\"}",
  "manifestType": "no-update",
  "timestamp": 1635595200000
}
```

**3. 回滚更新**

响应类型：`multipart/mixed`

```
--expo-multipart-boundary
Content-Type: application/json

{
  "manifestFilename": "manifest.json",
  "type": "rollback"
}
--expo-multipart-boundary
Content-Type: application/json
Content-Disposition: attachment; filename=manifest.json

{
  "id": "previous-update-id",
  "createdAt": "2023-10-29T12:00:00.000Z",
  "runtimeVersion": "1.0.0",
  "assets": [...],
  "launchAsset": {...},
  "metadata": {},
  "extra": {
    "expoClient": {}
  }
}
--expo-multipart-boundary--
```


## 错误处理

API 端点使用标准 HTTP 状态码指示请求的结果：

| 状态码 | 描述 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误或缺失 |
| 404 | 请求的资源未找到 |
| 500 | 服务器内部错误 |

错误响应采用以下格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误的详细描述"
  }
}
```

## 代码签名

如果启用了代码签名，服务器会使用配置的私钥对更新清单进行签名。

签名会添加到响应的 `expo-signature` 头部，格式为：

```
expo-signature: keyid="KEYID",signature="BASE64_SIGNATURE"
```

客户端应用必须配置相应的公钥来验证签名：

```json
{
  "expo": {
    "updates": {
      "codeSigningPublicKeyBase64": "BASE64_ENCODED_PUBLIC_KEY"
    }
  }
}
```

## OSS 适配器 API

OSS 适配器提供以下核心方法：

### getBucketName

获取 OSS 存储桶名称。

```typescript
getBucketName(): string
```

### listObjects

列出具有特定前缀的对象。

```typescript
listObjects(params: { prefix?: string }): Promise<{
  Contents: { Key: string; Size: number }[]
}>
```

### getObject

获取特定对象的内容。

```typescript
getObject(params: {
  key: string
}): Promise<{
  body: Uint8Array;
  contentType?: string
}>
```

### putObject

上传对象到 OSS。

```typescript
putObject(params: {
  key: string;
  body: Uint8Array;
  contentType?: string
}): Promise<void>
```

### deleteObject

删除 OSS 中的对象。

```typescript
deleteObject(params: { key: string }): Promise<void>
```

### headObject

获取对象的元数据而不下载内容。

```typescript
headObject(params: {
  key: string
}): Promise<{
  ContentType?: string;
  ContentLength?: number;
  LastModified?: Date
}>
```

### generatePresignedUrl

生成用于直接访问对象的预签名 URL。

```typescript
generatePresignedUrl(params: {
  key: string;
  expires?: number
}): Promise<string>
```

## 使用 API 的示例

### 在客户端应用中检查更新

```javascript
import * as Updates from 'expo-updates';

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}
```

### 使用 curl 测试 API

```bash
# 测试获取清单
curl -H "expo-protocol-version: 1" \
     -H "expo-platform: ios" \
     -H "expo-runtime-version: 1.0.0" \
     http://localhost:3000/api/manifest

```

## API 版本控制

Bun Expo Updates Server 通过 `expo-protocol-version` 请求头支持不同版本的 Expo Updates 协议。当前支持的版本：

- 版本 0：原始 Expo Updates 协议
- 版本 1：带有增强功能的更新协议，包括更多元数据支持

## 安全考虑

- API 端点不实施认证，建议在生产中使用 API 网关或代理进行保护
- 确保 OSS 凭证具有适当的限制，仅允许必要的操作
- 考虑使用 HTTPS 端点，特别是在生产环境中

## 测试和调试

要测试 API 端点，可以使用以下方法：

1. 使用 curl 或 Postman 发送测试请求
2. 启用详细日志记录查看请求处理细节：`DEBUG=true LOG_LANGUAGE=zh-CN bun run dev`
3. 检查服务器日志中的错误和警告
