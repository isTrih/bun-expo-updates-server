# Expo 更新服务器脚本文档

## 1. 脚本概述

此目录包含用于管理 Expo 更新部署和将资源上传到云存储（OSS）的脚本。

### upload.ts

用于导出 Expo 客户端项目并将更新部署到 OSS 的 TypeScript 脚本。此脚本：
- 从客户端项目中提取运行时版本
- 为更新生成时间戳
- 导出 Expo 项目
- 将导出的文件复制到具有适当版本控制的更新目录
- 创建或更新"latest"符号链接
- 将更新文件上传到 OSS

### uploadUpdatesToOSS.ts

将更新文件上传到已配置的云存储提供商（OSS）。支持：
- 多种 OSS 提供商：DogeCloud、七牛云、S3 或自定义提供商
- 自动设置文件的正确 MIME 类型
- 保留目录结构
- 提供中英双语详细日志

### exportClientExpoConfig.ts

从客户端项目导出 Expo 配置。由上传脚本使用，用于提取运行时版本等信息。

## 2. 必需的环境变量

在使用这些脚本之前，您需要在 `.env` 文件中配置以下环境变量：

### 客户端项目路径
```
CLIENT_PROJECT_PATH=/path/to/your/expo/client/project
```

### OSS 配置
```
# OSS 提供商 (dogecloud, qiniu, s3, 或 custom)
OSS_PROVIDER=dogecloud

# OSS 访问凭证
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key

# OSS 配置
OSS_REGION=automatic
OSS_BUCKET=your_bucket_name
OSS_ENDPOINT=your_endpoint_url  # S3或自定义提供商需要

# 可选：强制路径样式 (1 表示是，0 表示否)
OSS_FORCE_PATH_STYLE=0
```

### 可选设置
```
# 语言设置 (zh-CN 或 en-US)
LOG_LANGUAGE=zh-CN
```

## 3. 使用示例

### 完整示例：将更新上传到 OSS

#### 选项 1：使用 TypeScript 上传脚本

```bash
# 在 .env 文件中配置环境变量或内联提供
bun src/scripts/upload.ts
```

#### 选项 2：逐步手动过程

```bash
# 1. 导出客户端 Expo 配置以获取运行时版本
CLIENT_PROJECT_PATH=/path/to/client bun src/scripts/exportClientExpoConfig.ts > config.json
RUNTIME_VERSION=$(grep -o '"runtimeVersion":[^,}]*' config.json | cut -d':' -f2 | tr -d '" ')

# 2. 生成时间戳
TIMESTAMP=$(date +%s)

# 3. 创建目录结构
mkdir -p updates/$RUNTIME_VERSION/$TIMESTAMP

# 4. 导出 Expo 项目
cd /path/to/client
bun expo export
cd -

# 5. 将导出的文件复制到更新目录
cp -r /path/to/client/dist/* updates/$RUNTIME_VERSION/$TIMESTAMP/

# 6. 将 Expo 配置导出到更新目录
CLIENT_PROJECT_PATH=/path/to/client bun src/scripts/exportClientExpoConfig.ts > updates/$RUNTIME_VERSION/$TIMESTAMP/expoConfig.json

# 7. 创建或更新最新的符号链接
cd updates/$RUNTIME_VERSION/
rm -f latest
ln -sf $TIMESTAMP latest
cd -

# 8. 将更新上传到 OSS
RUNTIME_VERSION=$RUNTIME_VERSION TIMESTAMP=$TIMESTAMP bun src/scripts/uploadUpdatesToOSS.ts
```

## 4. 注意事项

1. **OSS 提供商配置**:
   - 确保您的 OSS 凭证正确并具有适当的权限
   - 在部署生产更新之前测试 OSS 配置
   - 不同的提供商可能有特定要求（请参阅其文档）

2. **符号链接**:
   - 创建"latest"符号链接，以便轻松引用最新的更新
   - 确保您的服务器环境支持符号链接

3. **错误处理**:
   - 如果上传失败，您可以使用错误消息中显示的命令手动重试
   - 检查日志以获取详细的错误信息

4. **权限**:
   - 脚本需要执行权限：`chmod +x src/scripts/*.ts`
   - 确保进程对更新目录具有写入权限

5. **运行时版本**:
   - 客户端应用程序必须在其 Expo 配置中具有有效的 `runtimeVersion`
   - 运行时版本决定了更新的兼容性

6. **文件类型**:
   - 所有文件都以适当的 MIME 类型上传以用于 Web 服务
   - 对于常见的 Web 资源（JS、JSON、图像、字体）存在特殊处理

## 5. 高级配置

### 自定义 OSS 提供商

要使用自定义 OSS 提供商，请在 `src/utils/oss-provider` 目录中实现提供商接口，并将其添加到工厂中。

### 多客户端项目

您可以通过为每个部署设置 `CLIENT_PROJECT_PATH` 来管理多个客户端项目的更新：

```bash
CLIENT_PROJECT_PATH=/path/to/project1 bun src/scripts/upload.ts
CLIENT_PROJECT_PATH=/path/to/project2 bun src/scripts/upload.ts
```

### CI/CD 集成

这些脚本可以集成到 CI/CD 流水线中。GitHub Actions 工作流示例：

```yaml
name: Deploy Expo Update

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install
      - name: Deploy update
        run: bun src/scripts/upload.ts
        env:
          CLIENT_PROJECT_PATH: ./client
          OSS_PROVIDER: ${{ secrets.OSS_PROVIDER }}
          OSS_ACCESS_KEY: ${{ secrets.OSS_ACCESS_KEY }}
          OSS_SECRET_KEY: ${{ secrets.OSS_SECRET_KEY }}
          OSS_BUCKET: ${{ secrets.OSS_BUCKET }}
```

## 6. 故障排除

### 常见问题

1. **"客户端项目路径不存在"**
   - 检查 CLIENT_PROJECT_PATH 是否指向有效的 Expo 项目
   - 确保路径是绝对的或从脚本位置正确解析的

2. **"无法获取客户端 Expo 配置"**
   - 验证客户端项目是带有 app.json/app.config.js 的有效 Expo 项目
   - 确保在服务器项目中安装了 @expo/config

3. **"无法创建最新的符号链接"**
   - 检查文件系统权限
   - 某些环境（如 Windows）可能对符号链接有限制

4. **"无法将文件上传到 OSS"**
   - 验证 OSS 凭证和权限
   - 检查与 OSS 提供商的网络连接
   - 确保存储桶存在且可访问

如需更多帮助，请查看日志或联系开发团队。