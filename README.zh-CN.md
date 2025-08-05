# Custom Expo Update Server

<p align="center">
  <img src="./website/docs/public/beu-icon.png" alt="Bun Expo Updates Server" width="200"/>
</p>


<p align="center"><a href="./README.md">English Documentation</a> | 中文文档</p>

<p align="center">
  <a href="https://bun-expo-updates.chaozj.com/"><img src="https://img.shields.io/badge/文档网站-Documentation-blue?style=for-the-badge" alt="Documentation"/></a>
</p>



<p align="center">
    <a href="https://afdian.tv/a/istrih"><img width="100" src="https://pic1.afdiancdn.com/static/img/welcome/button-sponsorme.png" alt="赞助我"></a>
  <img src="https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white" alt="Bun"/>
  <img src="https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37" alt="Expo"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"/>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/>
  <img src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" alt="Maintained"/>
</p>

这个仓库包含一个实现了 `Expo Updates` 协议规范的 `BUN` 服务器。

## 快速部署
<p align="left">
  <a href="https://app.rainyun.com/apps/rca/store/5/istrih_"><img src="https://rainyun-apps.cn-nb1.rains3.com/materials/deploy-on-rainyun-cn.svg" alt="在雨云上部署"/></a>
</p>

> [!IMPORTANT]
> 本仓库提供了协议如何转换为代码的基本演示。不保证其完整性、稳定性或性能足以用作`expo-updates`的完整后端。
> 我不为此类自定义`expo-updates`服务器实现提供技术支持。

## 为什么需要自定义更新服务器
`Expo`提供了名为`EAS（Expo Application Services）`的服务集，其中包括`EAS Update`，可以使用`expo-updates`库为`Expo`应用托管和提供更新。

在某些情况下，比如：~~很穷用不起EAS服务~~或主要用户在中国，您可能需要更精确地控制更新发送到应用的方式。一种选择是实现符合规范的自定义更新服务器，以提供更新清单和资产。

## 技术栈
- 运行时环境: Bun
- Web 框架: Elysia
- 开发语言: TypeScript
- OSS: 多吉云对象存储（S3协议）
- 缓存: 内存缓存（不需要Redis）

## 项目结构
```bash
bun-expo-updates-server/
├── .gitignore
├── README.md
├── README.zh-CN.md
├── bun.lock
├── package.json
├── .env.example                             # 环境变量示例文件
├── updates/                                 # 更新文件存储目录
├── logs/                                    # 日志文件
├── src/
│   ├── index.ts                             # 应用入口文件
│   ├── modules/                             # 核心模块
│   │   └── manifest.ts                      # 清单处理模块
│   ├── config/                              # 配置文件
│   │   └── oss-config.example.ts
│   ├── code-sign-keys/                      # 代码签名密钥
│   ├── test/                                # 测试文件
│   │   └── utils/                           # 工具测试
│   ├── scripts/                             # 脚本文件
│   │   ├── upload.sh                        # 更新版本脚本
│   │   ├── exportClientExpoConfig.ts        # 导出 Expo 客户端配置脚本
│   │   ├── updateMime.ts                    # 修复 MIME 类型脚本
│   │   └── uploadUpdatesToOSS.ts            # 上传更新到 OSS 脚本
│   └── utils/                               # 实用工具
│       ├── helper-oss.ts                    # OSS 帮助函数
│       ├── logger.ts                        # 日志工具
│       ├── util.ts                          # 通用工具函数
│       └── oss-provider/                    # OSS 提供者
│           ├── dogecloud-adapter.ts         # 多吉云适配器
│           ├── s3-adapter.ts                # S3 适配器
│           ├── factory.ts                   # 工厂模式适配器
│           └── types.ts                     # OSS 提供者类型定义
└── tsconfig.json
```

## 开始使用
### 更新相关术语
- 运行时版本 (Runtime version): 字符串类型。指定应用运行的底层原生代码版本。当更新依赖于新的或更改的原生代码时（如更新 Expo SDK 或添加原生模块），需要更新运行时版本。
- 平台 (Platform): "ios" 或 "android"。指定提供更新的平台。
- 清单 (Manifest): 协议中描述的对象。包含 Expo 应用加载更新所需的资产和其他详细信息。

### 如何使用服务器
#### 开发环境服务器
1. 安装依赖并启动服务器
   在项目根目录运行以下命令:

   ```bash
   bun install
   bun run dev
   ```
   服务器将在 http://localhost:3000 启动。

2. 配置环境变量
   创建一个 `.env` 文件并配置以下变量:

   ```bash
    # 日志设置 | Log Settings
    # 是否开启调试日志 | Enable debug logs
    DEBUG=true
    # 日志语言设置 | Log language setting (zh_CN/en_US)
    LOG_LANGUAGE=zh_CN
   
    # 对象存储服务配置 | Object Storage Service Configuration
    # OSS提供商 | OSS provider
    OSS_PROVIDER=your_oss_provider
    # OSS访问密钥 | OSS access key
    OSS_ACCESS_KEY=your_access_key
    # OSS密钥 | OSS secret key
    OSS_SECRET_KEY=your_secret_key
    # 是否强制使用路径样式 (0 false, 1 true) | Force path style (0 false, 1 true)
    OSS_FORCE_PATH_STYLE=0
    # OSS区域 | OSS region
    # OSS_REGION=your_region
    # OSS存储桶名称 | OSS bucket name
    # OSS_BUCKET=your_bucket
    # OSS端点 | OSS endpoint
    # OSS_ENDPOINT=your_endpoint
   
    # 客户端项目路径 | Client Project Path
    # 客户端项目的本地路径 | Local path to the client project
    CLIENT_PROJECT_PATH=/path/to/your/client/project
   
    # 私钥路径配置 | Private Key Path Configuration
    # 用于代码签名的私钥路径 | Path to the private key for code signing
    PRIVATE_KEY_PATH=code-sign-keys/private-key.pem
   
    # 服务端口配置 | Server Port Configuration
    # 服务器监听的端口 | Port on which the server listens
    port=3001
   
    # 更新资源下载地址(OSS或CDN) | Update Resource Download URL (OSS or CDN)
    # 更新资源的基础URL | Base URL for update resources
    HOSTNAME=https://your-update-domain.com
   ```

#### 生产环境服务器
1. 构建项目
   在项目根目录运行以下命令:
    ```bash
    bun install
    # 构建项目
   
    # 根据您的服务器架构选择合适的 target
    # 例如: bun-linux-x64
    bun build \
            --compile \
            --minify \
            --target bun-linux-x64 \
            --outfile server \
            ./src/index.ts
    ```
    | --target              | 操作系统  |  架构  | `haswell`架构 | `nehalem`架构 |
    | --------------------- | -------- | ----- | :-----------: | :-----------: |
    | bun-linux-x64         | Linux    | x64   |       ✅       |       ✅       |
    | bun-linux-arm64       | Linux    | arm64 |       ✅       |      N/A      |
    | bun-windows-x64       | Windows  | x64   |       ✅       |       ✅       |
    | ~~bun-windows-arm64~~ | Windows  | arm64 |       ❌       |       ❌       |
    | bun-darwin-x64        | macOS    | x64   |       ✅       |       ✅       |
    | bun-darwin-arm64      | macOS    | arm64 |       ✅       |      N/A      |

2. 启动服务器
   - 在文件`server`同目录运行以下命令:
     ```bash
         # 赋予执行权限
         chmod +x server
         mkdir -p logs
         # 启动服务器
         ./server
     ```
   - 服务器将在 http://localhost:3001 启动。

   - 使用pm2管理二进制文件
     - 在文件`server`同目录运行以下命令:
     ```bash
         # 赋予执行权限
         chmod +x server
         mkdir -p logs
     ```
    - 创建一个 `ecosystem.config.js` 文件:
    ```javascript
    module.exports = {
    apps: [
      {
        name: "bun-updates",
        script: "./server",
        env: {
          // 日志设置 | Log Settings
          // 是否开启调试日志 | Enable debug logs
          "DEBUG": "true",
   
          // 日志语言设置 | Log language setting (zh_CN/en_US)
          "LOG_LANGUAGE": "zh_CN",
   
          // 对象存储服务配置 | Object Storage Service Configuration
          // OSS提供商 | OSS provider
          "OSS_PROVIDER": "your_oss_provider",
   
          // OSS访问密钥 | OSS access key
          "OSS_ACCESS_KEY": "your_access_key",
   
          // OSS密钥 | OSS secret key
          "OSS_SECRET_KEY": "your_secret_key",
   
          // 是否强制使用路径样式 (0 false, 1 true) | Force path style (0 false, 1 true)
          "OSS_FORCE_PATH_STYLE": "0",
   
          // OSS区域 | OSS region
          // "OSS_REGION": "your_region",
   
          // OSS存储桶名称 | OSS bucket name
          // "OSS_BUCKET": "your_bucket",
   
          // OSS端点 | OSS endpoint
          // "OSS_ENDPOINT": "your_endpoint",
   
          // 客户端项目路径 | Client Project Path
          // 客户端项目的本地路径 | Local path to the client project
          "CLIENT_PROJECT_PATH": "/path/to/your/client/project",
   
          // 私钥路径配置 | Private Key Path Configuration
          // 用于代码签名的私钥路径 | Path to the private key for code signing
          "PRIVATE_KEY_PATH": "code-sign-keys/private-key.pem",
   
          // 服务端口配置 | Server Port Configuration
          // 服务器监听的端口 | Port on which the server listens
          "port": "3001",
   
          // 更新资源下载地址(OSS或CDN) | Update Resource Download URL (OSS or CDN)
          // 更新资源的基础URL | Base URL for update resources
          "HOSTNAME": "https://your-update-domain.com"
        }
      }
    ]
    }
    ```
    在`ecosystem.config.js`同目录下运行以下命令:
    ```bash
    pm2 start
    pm2 logs bun-updates
    ```

    以上命令会启动服务器并显示日志输出。通过使用 pm2，服务器将在后台运行，即使在会话结束后也能继续运行。您也可以使用其他 pm2 命令来管理服务器:

    ```bash
    # 查看所有进程状态
    pm2 list
   
    # 停止服务器
    pm2 stop bun-updates
   
    # 重启服务器
    pm2 restart bun-updates
   
    # 设置服务器开机自启动
    pm2 startup
    pm2 save
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

   ```bash
   # 导出 Expo 客户端
   ./src/scripts/export-client.sh
   
   # 上传更新到对象存储
   bun run src/scripts/uploadUpdatesToOSS.ts
   ```

   或者，您可以使用 `package.json` 中的命令
   ```bash
   bun up
   ```
   生成热更新包并上传。

5. 访问更新
   客户端应用将通过 `/api/manifest` 端点自动检查和下载更新。

## 服务器 API
服务器目前提供以下 API 端点:

- `GET /api/manifest`: 提供 Expo 更新清单
  - 支持参数:
    - `expo-protocol-version`: 头部参数，支持版本 0 和 1
    - `expo-platform`: 头部参数，值为 "ios" 或 "android"
    - `expo-runtime-version`: 头部参数，指定运行时版本
    - `expo-current-update-id`: 头部参数，客户端当前更新的 ID
    - `expo-embedded-update-id`: 头部参数，应用内嵌更新的 ID
    - `expo-expect-signature`: 头部参数，如果设置则会对响应进行签名
  - 响应:
    - 正常更新: 返回包含最新更新清单和资源信息的 multipart/mixed 响应
    - 回滚更新: 返回带有回滚指令的 multipart/mixed 响应
    - 无更新: 返回表明没有可用更新的响应

## 关于此服务器
此服务器使用 Bun 和 Elysia 框架创建，支持对象存储(OSS)功能来管理更新文件。主入口文件位于 src/index.ts，核心更新处理逻辑位于 src/modules/manifest.ts。

服务器支持以下功能:
- 多平台更新支持（iOS 和 Android）
- 基于运行时版本的更新管理
- 回滚机制
- 代码签名验证
- 对象存储（OSS）集成
- 日志记录

## Docker 部署

您也可以使用 Docker 部署此服务器：

### 使用预构建的 Docker 镜像

```bash
docker pull istrih/bun-expo-updates-server:latest

docker run -p 3000:3000 \
  -e OSS_PROVIDER=your_oss_provider \
  -e OSS_ACCESS_KEY=your_access_key \
  -e OSS_SECRET_KEY=your_secret_key \
  -e DEBUG=true \
  -e LOG_LANGUAGE=zh_CN \
  -e HOSTNAME=https://your-update-domain.com \
  istrih/bun-expo-updates-server:latest
```

### 构建自己的 Docker 镜像

1. 克隆仓库
```bash
git clone https://github.com/yourusername/bun-expo-updates-server.git
cd bun-expo-updates-server
```

2. 构建 Docker 镜像
```bash
docker build -t bun-expo-updates-server .
```

3. 运行容器
```bash
docker run -p 3000:3000 \
  -e OSS_PROVIDER=your_oss_provider \
  -e OSS_ACCESS_KEY=your_access_key \
  -e OSS_SECRET_KEY=your_secret_key \
  bun-expo-updates-server
```

### Docker Compose

创建一个 `docker-compose.yml` 文件：

```yaml
version: '3'
services:
  updates-server:
    image: istrih/bun-expo-updates-server:latest
    ports:
      - "3000:3000"
    environment:
      - OSS_PROVIDER=your_oss_provider
      - OSS_ACCESS_KEY=your_access_key
      - OSS_SECRET_KEY=your_secret_key
      - DEBUG=true
      - LOG_LANGUAGE=zh_CN
      - HOSTNAME=https://your-update-domain.com
    restart: unless-stopped
```

然后运行：
```bash
docker-compose up -d
```

## 许可证
本项目使用 GPL-3.0-or-later 许可证。
