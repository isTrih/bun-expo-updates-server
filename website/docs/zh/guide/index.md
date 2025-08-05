# 快速开始

## 项目介绍

Bun Expo Updates Server 是一个使用 Bun 运行时实现的 Expo Updates 协议服务器。该服务器允许您为 Expo 应用程序提供自定义更新，无需依赖 Expo 的官方 EAS Update 服务。

![Bun Expo Updates 服务器](/beu-icon.png)

## 为什么选择自定义更新服务器？

Expo 提供了名为 EAS（Expo Application Services）的服务集，其中包括 EAS Update，可以使用 expo-updates 库为 Expo 应用托管和提供更新。但在某些情况下，您可能需要：

- 更精确地控制更新发送到应用的方式
- 将更新部署到特定区域的服务器以提高访问速度
- 使用自己的云存储解决方案
- 降低成本或满足特定的合规要求

## 技术栈

- **运行时环境**: [Bun](https://bun.sh/)
- **Web 框架**: [Elysia](https://elysiajs.com/)
- **开发语言**: TypeScript
- **云存储**: 支持多种对象存储服务 (DogeCloud、七牛云、AWS S3等)

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/isTrih/bun-expo-updates-server.git
cd bun-expo-updates-server
```

### 2. 安装依赖

确保您已安装 [Bun](https://bun.sh/)，然后运行：

```bash
bun install
```

### 3. 配置环境变量

创建一个 `.env` 文件并配置必要的环境变量：

```bash
# Redis配置
REDIS_URL=redis://localhost:6379

# 日志设置
DEBUG=true
LOG_LANGUAGE=zh_CN

# OSS (对象存储) 配置
OSS_PROVIDER=your_oss_provider
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

### 4. 启动开发服务器

```bash
bun run dev
```

服务器将在 http://localhost:3001 启动（或您在 .env 中配置的端口）。

## 配置 Expo 客户端应用

确保您的 Expo 应用配置为从自定义服务器加载更新。在应用的 app.json 文件中设置：

```json
{
  "expo": {
    "updates": {
      "url": "http://your-server-url.com/api/manifest",
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    }
  }
}
```

## 使用更新系统

### 创建和部署更新

使用项目提供的脚本导出应用更新并上传到对象存储：

```bash
# 使用预设命令上传更新
bun up
```

这个命令将执行以下操作：
1. 从客户端项目导出更新
2. 生成更新时间戳和目录结构
3. 将更新文件上传到配置的对象存储

## 下一步

- [服务器配置](/zh/guide/configuration) - 了解如何详细配置服务器
- [更新管理](/zh/guide/updates) - 学习如何管理和部署应用更新
- [OSS适配器](/zh/guide/oss-adapters) - 了解对象存储适配器系统