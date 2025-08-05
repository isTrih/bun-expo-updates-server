# 自定义 Expo 更新服务器
[English Documentation](./README.md) | 中文文档

这个仓库包含一个实现了 `Expo Updates` 协议规范的 `BUN` 服务器。

[!IMPORTANT]
本仓库提供了协议如何转换为代码的基本演示。不保证其完整性、稳定性或性能足以用作`expo-updates`的完整后端。
本人不为此类自定义`expo-updates`服务器实现提供技术支持。

## 为什么需要自定义更新服务器
`Expo`提供了名为`EAS（Expo Application Services）`的服务集，其中包括`EAS Update`，可以使用`expo-updates`库为`Expo`应用托管和提供更新。

在某些情况，比如：~~很穷用不起EAS服务~~，主要用户在国内，可能需要更精确地控制更新发送到应用的方式，一种选择是实现符合规范的自定义更新服务器，以提供更新清单和资产。

## 技术栈
- 运行时环境 : Bun
- Web 框架 : Elysia
- 开发语言 : TypeScript
- oss : 多吉云对象存储（s3协议）
## 项目结构
```
bun-expo-updates-server/
├── .gitignore
├── README.md
├── README.zh-CN.md
├── bun.lock
├── package.json
├── .env.example          # 环境变量示例文件
├── updates/              # 更新文件存储目录
├── logs/                 # 日志文件
├── src/
│   ├── index.ts          # 应用入口文件
│   ├── modules/          # 核心模块
│   │   └── manifest.ts   # 清单处理模块
│   ├── config/           # 配置文件
│   │   └── oss-config.example.ts
│   ├── code-sign-keys/                    # 代码签名密钥
│   ├── test/                              # 测试文件
│   │   └── utils/                         # 工具测试
│   ├── scripts/                           # 脚本文件
│   │   ├── upload.sh                      # 更新版本脚本
│   │   ├── exportClientExpoConfig.ts      # 导出 Expo 客户端配置脚本
│   │   ├── updateMime.ts                  # 修复 MIME 类型脚本
│   │   └── uploadUpdatesToOSS.ts          # 上传更新到 OSS 脚本
│   └── utils/                             # 实用工具
│       ├── helper-oss.ts                  # OSS 帮助函数
│       ├── logger.ts                      # 日志工具
│       ├── util.ts                        # 通用工具函数
│       └── oss-provider/                  # OSS 提供者
│           ├── dogecloud-adapter.ts       # 多吉云适配器
│           ├── s3-adapter.ts              # S3 适配器
│           ├── factory.ts                 # 工厂模式适配器
│           └── types.ts                   # OSS 提供者类型定义
└── tsconfig.json
```
## 开始使用
### 更新相关术语
- 运行时版本 (Runtime version) : 字符串类型。指定应用运行的底层原生代码版本。当更新依赖于新的或更改的原生代码时（如更新 Expo SDK 或添加原生模块），需要更新运行时版本。
- 平台 (Platform) : "ios" 或 "android"。指定提供更新的平台。
- 清单 (Manifest) : 协议中描述的对象。包含 Expo 应用加载更新所需的资产和其他详细信息。
### 如何使用服务器
1. 安装依赖并启动服务器
   在项目根目录运行以下命令:

   ```
   bun install
   bun run dev
   ```
   服务器将在 http://localhost:3000 启动。

2. 配置环境变量
   创建一个 `.env` 文件并配置以下变量:

   ```
   OSS_PROVIDER=dogecloud  # 或 s3、qiniu、custom
   OSS_ACCESS_KEY=你的访问密钥
   OSS_SECRET_KEY=你的密钥
   OSS_REGION=automatic    # 或指定区域
   OSS_BUCKET=你的存储桶名称
   OSS_ENDPOINT=           # 可选，适用于自定义 S3
   ```

3. 配置 Expo 应用
   确保您的 Expo 应用配置为从自定义服务器加载更新。在应用的 app.json 文件中设置:

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

4. 导出和上传更新
   使用项目提供的脚本导出应用更新并上传到对象存储:

   ```
   # 导出 Expo 客户端
   ./src/scripts/export-client.sh

   # 上传更新到对象存储
   bun run src/scripts/uploadUpdatesToOSS.ts
   ```

   或者，您可以使用 Expo EAS 导出更新，然后手动将更新文件放置在 `updates/` 目录中。

5. 访问更新
   客户端应用将通过 `/api/manifest` 端点自动检查和下载更新。
## 服务器 API
服务器目前提供以下 API 端点:

- `GET /api/manifest` : 提供 Expo 更新清单
  - 支持参数:
    - `expo-protocol-version` : 头部参数, 支持版本 0 和 1
    - `expo-platform` : 头部参数, 值为 "ios" 或 "android"
    - `expo-runtime-version` : 头部参数, 指定运行时版本
    - `expo-current-update-id` : 头部参数, 客户端当前更新的 ID
    - `expo-embedded-update-id` : 头部参数, 应用内嵌更新的 ID
    - `expo-expect-signature` : 头部参数, 如果设置则会对响应进行签名
  - 响应:
    - 正常更新: 返回包含最新更新清单和资源信息的 multipart/mixed 响应
    - 回滚更新: 返回回滚指令的 multipart/mixed 响应
    - 无更新: 返回无更新可用的指令响应
## 关于此服务器
此服务器使用 Bun 和 Elysia 框架创建，支持对象存储(OSS)功能来管理更新文件。主入口文件位于 src/index.ts，核心更新处理逻辑位于 src/modules/manifest.ts。

服务器支持以下功能:
- 多平台更新支持(iOS 和 Android)
- 基于运行时版本的更新管理
- 回滚机制
- 代码签名验证
- 对象存储(OSS)集成
- 日志记录

## Docker 支持
本项目支持通过 Docker 部署，包含以下相关文件：

- `dockerfile`: 定义 Docker 镜像构建过程
- `docker-compose.yml`: 定义服务组合配置
- `build-docker.sh`: Docker 构建脚本

### 使用 Docker 部署
1. 构建 Docker 镜像：
   ```
   ./build-docker.sh
   ```

2. 使用 docker-compose 启动服务：
   ```
   docker-compose up -d
   ```

3. 查看日志：
   ```
   docker-compose logs -f
   ```

### 环境配置
在 Docker 部署中，可以通过环境变量或 `.env` 文件配置服务参数，主要配置项包括：

- `OSS_PROVIDER`: 对象存储提供商，支持 "dogecloud"、"qiniu"、"s3" 或 "custom"
- `OSS_ACCESS_KEY`: 访问密钥
- `OSS_SECRET_KEY`: 密钥
- `OSS_REGION`: 区域
- `OSS_BUCKET`: 存储桶名称
- `OSS_ENDPOINT`: 自定义端点（适用于自定义 S3）

## 许可证
本项目使用 MIT 许可证。
