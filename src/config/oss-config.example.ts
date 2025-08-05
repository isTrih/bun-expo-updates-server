// OSS配置示例文件
// 复制此文件为 oss-config.ts 并根据你的需求修改配置

import {
  setupDefaultOSS,
  createOSSConfig,
} from "../utils/oss-provider/factory";
import type { OSSConfig } from "../utils/oss-provider/types";

// DogeCloud 配置示例
export const dogecloudConfig: OSSConfig = {
  provider: "dogecloud",
  accessKey: process.env.OSS_ACCESS_KEY,
  secretKey: process.env.OSS_SECRET_KEY,
  region: process.env.OSS_REGION || "automatic",
  forcePathStyle: Boolean(Number(process.env.OSS_FORCE_PATH_STYLE)), // 可选
  // 如果需要其他配置，可以在这里添加
};

// 阿里云 OSS 配置示例（需要实现相应的适配器）
export const aliyunOSSConfig: OSSConfig = {
  provider: "custom", // 需要注册为自定义适配器
  bucket: process.env.OSS_BUCKET || "your-aliyun-bucket",
  region: process.env.OSS_REGION || "oss-cn-hangzhou",
  endpoint: process.env.OSS_ENDPOINT || "https://oss-cn-hangzhou.aliyuncs.com",
  accessKey: process.env.OSS_ACCESS_KEY,
  secretKey: process.env.OSS_SECRET_KEY,
};

// AWS S3 配置示例（需要实现相应的适配器）
export const awsS3Config: OSSConfig = {
  provider: "s3",
  bucket: process.env.OSS_BUCKET || "your-s3-bucket",
  region: process.env.OSS_REGION || "us-east-1",
  accessKey: process.env.OSS_ACCESS_KEY,
  secretKey: process.env.OSS_SECRET_KEY,
};

// 七牛云配置示例（需要实现相应的适配器）
export const qiniuConfig: OSSConfig = {
  provider: "qiniu",
  bucket: process.env.OSS_BUCKET || "your-qiniu-bucket",
  region: process.env.OSS_REGION || "z0", // 华东区域
  accessKey: process.env.OSS_ACCESS_KEY,
  secretKey: process.env.OSS_SECRET_KEY,
};

// 腾讯云 COS 配置示例（需要实现相应的适配器）
export const tencentCOSConfig: OSSConfig = {
  provider: "custom",
  bucket: process.env.OSS_BUCKET || "your-cos-bucket-1234567890",
  region: process.env.OSS_REGION || "ap-beijing",
  endpoint: process.env.OSS_ENDPOINT || "https://cos.ap-beijing.myqcloud.com",
  accessKey: process.env.OSS_ACCESS_KEY,
  secretKey: process.env.OSS_SECRET_KEY,
};

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

// 初始化 OSS 配置
export async function initializeOSS(): Promise<void> {
  try {
    const config = getOSSConfig();
    await setupDefaultOSS(config);
    console.log(`OSS initialized with provider: ${config.provider}`);
  } catch (error) {
    console.error("Failed to initialize OSS:", error);
    throw error;
  }
}

// 环境变量模板
export const requiredEnvVars = {
  dogecloud: ["OSS_ACCESS_KEY", "OSS_SECRET_KEY"],
  aliyun: ["OSS_ACCESS_KEY", "OSS_SECRET_KEY"],
  aws: ["OSS_ACCESS_KEY", "OSS_SECRET_KEY"],
  qiniu: ["OSS_ACCESS_KEY", "OSS_SECRET_KEY"],
  tencent: ["OSS_ACCESS_KEY", "OSS_SECRET_KEY"],
};

// 验证环境变量
export function validateEnvVars(): void {
  const provider = process.env.OSS_PROVIDER || "dogecloud";
  const requiredVars =
    requiredEnvVars[provider as keyof typeof requiredEnvVars];

  if (!requiredVars) {
    throw new Error(`Unknown OSS provider: ${provider}`);
  }

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables for ${provider}: ${missingVars.join(", ")}`,
    );
  }
}

// 多环境配置
export const envConfigs = {
  development: {
    ...dogecloudConfig,
    // 开发环境特定配置
  },
  staging: {
    ...dogecloudConfig,
    // 测试环境特定配置
  },
  production: {
    ...dogecloudConfig,
    // 生产环境特定配置
  },
};

// 根据 NODE_ENV 获取配置
export function getEnvSpecificConfig(): OSSConfig {
  const env = process.env.NODE_ENV || "development";
  return envConfigs[env as keyof typeof envConfigs] || envConfigs.development;
}
