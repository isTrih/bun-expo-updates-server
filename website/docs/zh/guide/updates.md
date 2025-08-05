# 更新管理

本页面介绍如何在 Bun Expo Updates Server 中管理和部署应用更新。

## 更新相关术语

在开始之前，了解一些关键术语很重要：

- **运行时版本 (Runtime Version)**: 字符串类型，指定应用运行的底层原生代码版本。当更新依赖于新的或更改的原生代码时（如更新 Expo SDK 或添加原生模块），需要更新运行时版本。
- **平台 (Platform)**: "ios" 或 "android"，指定提供更新的平台。
- **清单 (Manifest)**: 协议中描述的对象，包含 Expo 应用加载更新所需的资产和其他详细信息。
- **时间戳 (Timestamp)**: 用于标识和组织更新的唯一时间值。

## 更新目录结构

Bun Expo Updates Server 使用以下目录结构管理更新：

```
updates/
├── [运行时版本1]/
│   ├── [时间戳1]/
│   │   ├── bundles/
│   │   │   ├── android-xxx.js
│   │   │   └── ios-xxx.js
│   │   ├── assets/
│   │   └── expoConfig.json
│   ├── [时间戳2]/
│   │   └── ...
│   └── latest -> [最新时间戳目录的符号链接]
└── [运行时版本2]/
    └── ...
```

这种结构允许：
- 按运行时版本分离更新
- 维护每个更新的历史版本
- 通过"latest"符号链接快速引用最新更新

## 创建和部署更新

### 使用内置脚本

Bun Expo Updates Server 提供了一个简便的脚本来导出、组织和上传更新。这是推荐的方法：

```bash
# 使用预设命令上传更新
bun up
```

这个简单命令会执行完整的更新流程，包括：
1. 从客户端项目中提取运行时版本
2. 为更新生成时间戳
3. 导出 Expo 项目
4. 将导出的文件复制到具有适当版本控制的更新目录
5. 创建或更新"latest"符号链接
6. 将更新文件上传到 OSS（对象存储服务）

### 手动步骤

如果您需要更多控制或自定义流程，可以手动执行以下步骤：

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

## 运行时版本管理

运行时版本是应用原生代码的标识符，对于确保兼容性至关重要。

### 更新运行时版本

当您对应用进行需要更新原生代码的更改时（例如，更新 Expo SDK 版本或添加原生模块），应该更新运行时版本：

1. 在客户端项目的 `app.json` 或 `app.config.js` 中更新 `runtimeVersion`：

```json
{
  "expo": {
    "runtimeVersion": "2.0.0"
  }
}
```

2. 重新构建并分发应用的新二进制版本
3. 为新的运行时版本创建更新

### 运行时版本策略

为确保兼容性，建议采用以下策略：

- 对于小的 JavaScript 更改和资产更新，保持相同的运行时版本
- 对于需要原生代码更改的更新，递增运行时版本并发布新的应用二进制文件
- 考虑使用语义化版本控制（如 "1.0.0"）作为运行时版本

## 回滚更新

如果部署了有问题的更新，您可以：

1. 从特定版本创建回滚更新：

```bash
# 找到您想回滚到的更新时间戳
ls -la updates/[运行时版本]/

# 更新"latest"符号链接以指向旧的更新
cd updates/[运行时版本]/
rm -f latest
ln -sf [旧的时间戳] latest
cd -
```

2. 可选：为了防止问题，您可以创建特定于平台的回滚：

```bash
# 为特定平台创建回滚指令
# 这需要手动修改清单文件
```

## 多平台更新

Bun Expo Updates Server 支持为 iOS 和 Android 平台提供不同的更新。Expo 的导出流程会自动为每个平台创建不同的捆绑包。

### 平台特定更新

在某些情况下，您可能希望仅为特定平台部署更新：

1. 在导出时指定平台：

```bash
# 仅为 iOS 导出
cd /path/to/client
bun expo export --platform ios
```

2. 将更新上传到适当的目录

## CI/CD 集成

Bun Expo Updates Server 的脚本可以轻松集成到 CI/CD 流水线中。

### GitHub Actions 示例

以下是 GitHub Actions 工作流程示例，用于自动部署更新：

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

## 更新验证和监控

### 验证更新

在向用户部署之前，应验证更新：

1. 使用开发环境测试更新
2. 检查清单内容和资产完整性
3. 验证代码签名是否正常工作（如果启用）

### 监控更新服务

为确保更新服务正常运行：

1. 实现健康检查端点
2. 监控服务器日志中的错误
3. 设置 OSS 存储空间的监控

## 最佳实践

1. **频繁备份**：定期备份更新文件和清单
2. **版本控制**：使用语义化版本控制来管理运行时版本
3. **渐进式部署**：考虑分阶段向用户群发布更新
4. **回滚计划**：始终有一个明确的回滚计划
5. **资源优化**：优化资产大小以减少下载时间