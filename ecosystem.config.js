module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      env: {
        // Redis配置 | Redis Configuration
        // 格式 Format: redis://password@localhost:6379
        REDIS_URL: "redis://localhost:6379",

        // 日志设置 | Log Settings
        // 是否开启调试日志 | Enable debug logs
        DEBUG: "true",

        // 日志语言设置 | Log language setting (zh_CN/en_US)
        LOG_LANGUAGE: "zh_CN",

        // 对象存储服务配置 | Object Storage Service Configuration
        // OSS提供商 | OSS provider
        OSS_PROVIDER: "your_oss_provider",

        // OSS访问密钥 | OSS access key
        OSS_ACCESS_KEY: "your_access_key",

        // OSS密钥 | OSS secret key
        OSS_SECRET_KEY: "your_secret_key",

        // 是否强制使用路径样式 (0 false, 1 true) | Force path style (0 false, 1 true)
        OSS_FORCE_PATH_STYLE: "0",

        // OSS区域 | OSS region
        // "OSS_REGION": "your_region",

        // OSS存储桶名称 | OSS bucket name
        // "OSS_BUCKET": "your_bucket",

        // OSS端点 | OSS endpoint
        // "OSS_ENDPOINT": "your_endpoint",

        // 客户端项目路径 | Client Project Path
        // 客户端项目的本地路径 | Local path to the client project
        CLIENT_PROJECT_PATH: "/path/to/your/client/project",

        // 私钥路径配置 | Private Key Path Configuration
        // 用于代码签名的私钥路径 | Path to the private key for code signing
        PRIVATE_KEY_PATH: "code-sign-keys/private-key.pem",

        // 服务端口配置 | Server Port Configuration
        // 服务器监听的端口 | Port on which the server listens
        port: "3001",

        // 更新资源下载地址(OSS或CDN) | Update Resource Download URL (OSS or CDN)
        // 更新资源的基础URL | Base URL for update resources
        HOSTNAME: "https://your-update-domain.com",
      },
    },
  ],
};
