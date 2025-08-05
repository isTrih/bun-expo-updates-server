# 服务器配置

本页面将详细介绍如何配置 Bun Expo Updates Server，包括环境变量、Redis 配置、对象存储设置等。

## 环境变量配置

Bun Expo Updates Server 使用环境变量进行配置。您可以通过 `.env` 文件或直接在环境中设置这些变量。以下是所有可用的环境变量：

### 基本配置

| 环境变量 | 必填 | 描述 | 默认值 |
|---------|------|------|-------|
| `port` | 否 | 服务器监听的端口 | `3000` |
| `DEBUG` | 否 | 是否启用调试日志 | `false` |
| `LOG_LANGUAGE` | 否 | 日志语言，支持 `zh-CN` 或 `en-US` | `zh-CN` |
| `HOSTNAME` | 是 | 更新资源的基础URL | - |

### Redis 配置

| 环境变量 | 必填 | 描述 | 默认值 |
|---------|------|------|-------|
| `REDIS_URL` | 是 | Redis 连接 URL，格式：`redis://[用户名]:[密码]@主机:端口` | - |

### 客户端项目配置

| 环境变量 | 必填 | 描述 | 默认值 |
|---------|------|------|-------|
| `CLIENT_PROJECT_PATH` | 是 | 客户端 Expo 项目的本地路径 | - |

### 代码签名配置

| 环境变量 | 必填 | 描述 | 默认值 |
|---------|------|------|-------|
| `PRIVATE_KEY_PATH` | 否 | 用于代码签名的私钥路径 | `code-sign-keys/private-key.pem` |

### 对象存储 (OSS) 配置

| 环境变量 | 必填 | 描述 | 默认值 |
|---------|------|------|-------|
| `OSS_PROVIDER` | 是 | OSS 提供商，支持 `dogecloud`、`qiniu`、`s3` 或 `custom` | - |
| `OSS_ACCESS_KEY` | 是 | OSS 访问密钥 | - |
| `OSS_SECRET_KEY` | 是 | OSS 密钥 | - |
| `OSS_FORCE_PATH_STYLE` | 否 | 是否强制使用路径样式 (0 false, 1 true) | `0` |
| `OSS_REGION` | 是* | OSS 区域，某些提供商需要 | - |
| `OSS_BUCKET` | 是* | OSS 存储桶名称，某些提供商需要 | - |
| `OSS_ENDPOINT` | 是* | OSS 端点，S3 或自定义提供商需要 | - |

*注意：某些变量根据选择的 OSS 提供商可能是必填的。

## .env 文件示例

以下是一个完整的 `.env` 文件示例：

```bash
# Redis配置
REDIS_URL=redis://localhost:6379

# 日志设置
DEBUG=true
LOG_LANGUAGE=zh-CN

# OSS (对象存储) 配置
OSS_PROVIDER=dogecloud
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key
OSS_FORCE_PATH_STYLE=0
# OSS_REGION=your_region
# OSS_BUCKET=your_bucket
# OSS_ENDPOINT=your_endpoint

# 客户端项目路径
CLIENT_PROJECT_PATH=/path/to/your/client/project

# 私钥路径配置
PRIVATE_KEY_PATH=code-sign-keys/private-key.pem

# 服务端口配置
port=3001

# 更新资源下载地址
HOSTNAME=https://your-update-domain.com
```

## Redis 配置

Redis 用于缓存更新清单和其他服务器状态。确保您有一个可用的 Redis 实例，并通过 `REDIS_URL` 环境变量进行配置。

### Redis 连接格式

```
redis://[[username]:[password]@][host][:port][/db-number]
```

例如：
- `redis://localhost:6379` - 连接本地 Redis，无密码
- `redis://:password123@redis-server:6379` - 连接带密码的 Redis 服务器
- `redis://username:password@redis-server:6379/1` - 使用用户名、密码和特定数据库

## 代码签名

Expo Updates 协议支持使用代码签名来验证更新的完整性。要启用代码签名，您需要生成密钥对并配置私钥路径：

### 生成密钥对

```bash
# 创建目录
mkdir -p code-sign-keys

# 生成私钥
openssl genrsa -out code-sign-keys/private-key.pem 2048

# 从私钥生成公钥
openssl rsa -in code-sign-keys/private-key.pem -pubout -out code-sign-keys/public-key.pem
```

将 `PRIVATE_KEY_PATH` 环境变量设置为私钥的路径：

```bash
PRIVATE_KEY_PATH=code-sign-keys/private-key.pem
```

在您的 Expo 客户端配置中，添加公钥配置：

```json
{
  "expo": {
    "updates": {
      "url": "https://your-server-url.com/api/manifest",
      "codeSigningPublicKeyBase64": "您的公钥（Base64编码）",
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    }
  }
}
```

要获取公钥的 Base64 编码，您可以运行：

```bash
cat code-sign-keys/public-key.pem | grep -v "PUBLIC KEY" | tr -d '\n'
```

## 对象存储 (OSS) 配置

服务器支持多种对象存储服务，用于存储更新文件。根据您选择的提供商，配置所需的环境变量：

### DogeCloud 配置

```bash
OSS_PROVIDER=dogecloud
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key
```

### 七牛云配置

```bash
OSS_PROVIDER=qiniu
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key
OSS_REGION=your_region
OSS_BUCKET=your_bucket
```

### AWS S3 配置

```bash
OSS_PROVIDER=s3
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key
OSS_REGION=your_region
OSS_BUCKET=your_bucket
OSS_ENDPOINT=your_endpoint
OSS_FORCE_PATH_STYLE=0
```

### 自定义 OSS 提供商

如需使用自定义 OSS 提供商，请参阅 [OSS适配器](/zh/guide/oss-adapters) 部分，了解如何实现和注册自定义适配器。

## 生产环境配置

在生产环境中，建议：

1. 禁用调试日志：
   ```bash
   DEBUG=false
   ```

2. 使用安全的 Redis 配置，包括密码和 TLS：
   ```bash
   REDIS_URL=redis://:your-password@your-redis-host:6379
   ```

3. 确保 HOSTNAME 使用 HTTPS：
   ```bash
   HOSTNAME=https://your-production-domain.com
   ```

4. 考虑使用环境变量管理工具，如 Docker Secrets 或云平台的环境变量管理功能，而不是直接使用 .env 文件。

## 高级配置

### 多客户端项目配置

如果您需要管理多个客户端项目的更新，可以根据需要切换 `CLIENT_PROJECT_PATH`：

```bash
# 为项目1上传更新
CLIENT_PROJECT_PATH=/path/to/project1 bun src/scripts/upload.ts

# 为项目2上传更新
CLIENT_PROJECT_PATH=/path/to/project2 bun src/scripts/upload.ts
```

### 性能调优

对于高流量场景，考虑：

1. 增加 Redis 连接池大小
2. 使用 CDN 分发更新文件
3. 为服务器配置适当的资源限制

关于更多高级配置选项，请参阅服务器源代码中的相关模块文档。