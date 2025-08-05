// OSS工厂类，用于创建和管理不同的OSS提供商适配器
// OSS Factory class for creating and managing different OSS provider adapters
import { IOSSProvider, IOSSProviderFactory, OSSConfig } from "./types";
import { DogeCloudAdapter } from "./dogecloud-adapter";
import { S3Adapter } from "./s3-adapter";
import { loggers, bilingualMsg } from "../logger";

// 使用通用日志工具
// Using common logging utilities
const logger = loggers.oss("Factory");

export class OSSProviderFactory implements IOSSProviderFactory {
  private static instance: OSSProviderFactory;
  private providers: Map<string, new (config: OSSConfig) => IOSSProvider> =
    new Map();

  private constructor() {
    logger.info(
      bilingualMsg("初始化OSS提供商工厂", "Initializing OSS provider factory"),
    );
    // 注册默认支持的OSS提供商
    // Register default supported OSS providers
    this.registerProvider("dogecloud", DogeCloudAdapter);
    this.registerProvider("s3", S3Adapter);
    logger.info(
      bilingualMsg(
        `已注册默认OSS提供商: ${this.getAvailableProviders().join(", ")}`,
        `Registered default OSS providers: ${this.getAvailableProviders().join(", ")}`,
      ),
    );
  }

  public static getInstance(): OSSProviderFactory {
    if (!OSSProviderFactory.instance) {
      logger.info(
        bilingualMsg(
          "创建OSS提供商工厂单例",
          "Creating OSS provider factory singleton",
        ),
      );
      OSSProviderFactory.instance = new OSSProviderFactory();
    }
    return OSSProviderFactory.instance;
  }

  /**
   * 注册新的OSS提供商适配器
   * Register a new OSS provider adapter
   * @param name 提供商名称 Provider name
   * @param providerClass 适配器类 Adapter class
   */
  public registerProvider(
    name: string,
    providerClass: new (config: OSSConfig) => IOSSProvider,
  ): void {
    logger.info(
      bilingualMsg(
        `注册OSS提供商: ${name}`,
        `Registering OSS provider: ${name}`,
      ),
    );
    this.providers.set(name.toLowerCase(), providerClass);
  }

  /**
   * 创建OSS提供商实例
   * Create an OSS provider instance
   * @param config OSS配置 OSS configuration
   * @returns OSS提供商实例 OSS provider instance
   */
  public async createProvider(config: OSSConfig): Promise<IOSSProvider> {
    const providerName = config.provider.toLowerCase();
    logger.info(
      bilingualMsg(
        `创建OSS提供商实例: ${providerName}, 存储桶: ${config.bucket}`,
        `Creating OSS provider instance: ${providerName}, bucket: ${config.bucket}`,
      ),
    );

    const ProviderClass = this.providers.get(providerName);

    if (!ProviderClass) {
      logger.error(
        bilingualMsg(
          `不支持的OSS提供商: ${config.provider}`,
          `Unsupported OSS provider: ${config.provider}`,
        ),
      );
      throw new Error(
        `Unsupported OSS provider: ${config.provider}. Available providers: ${Array.from(
          this.providers.keys(),
        ).join(", ")}`,
      );
    }

    try {
      logger.info(
        bilingualMsg(
          `实例化OSS适配器: ${providerName}`,
          `Instantiating OSS adapter: ${providerName}`,
        ),
      );
      const provider = new ProviderClass(config);

      // 如果适配器有初始化方法，调用它
      if (
        "initialize" in provider &&
        typeof provider.initialize === "function"
      ) {
        logger.info(
          bilingualMsg(
            `初始化OSS适配器: ${providerName}`,
            `Initializing OSS adapter: ${providerName}`,
          ),
        );
        await (provider as any).initialize();
      }

      logger.info(
        bilingualMsg(
          `OSS提供商 ${providerName} 创建成功`,
          `OSS provider ${providerName} created successfully`,
        ),
      );
      return provider;
    } catch (error) {
      logger.error(
        bilingualMsg(
          `创建OSS提供商 ${providerName} 失败`,
          `Failed to create OSS provider ${providerName}`,
        ),
        error,
      );
      throw error;
    }
  }

  /**
   * 获取所有已注册的提供商名称
   * Get all registered provider names
   * @returns 提供商名称数组 Array of provider names
   */
  public getAvailableProviders(): string[] {
    const providers = Array.from(this.providers.keys());
    logger.info(
      bilingualMsg(
        `获取可用OSS提供商列表: ${providers.join(", ")}`,
        `Getting available OSS providers list: ${providers.join(", ")}`,
      ),
    );
    return providers;
  }

  /**
   * 检查是否支持指定的提供商
   * Check if the specified provider is supported
   * @param providerName 提供商名称 Provider name
   * @returns 是否支持 Whether supported
   */
  public isProviderSupported(providerName: string): boolean {
    const isSupported = this.providers.has(providerName.toLowerCase());
    logger.info(
      bilingualMsg(
        `检查OSS提供商 ${providerName} 是否支持: ${isSupported ? "是" : "否"}`,
        `Checking if OSS provider ${providerName} is supported: ${isSupported ? "yes" : "no"}`,
      ),
    );
    return isSupported;
  }
}

// OSS管理器类，提供单一的OSS操作接口
// OSS Manager class, providing a single interface for OSS operations
export class OSSManager {
  private provider!: IOSSProvider;
  private config: OSSConfig;

  constructor(config: OSSConfig) {
    this.config = config;
  }

  /**
   * 初始化OSS管理器
   * Initialize OSS manager
   */
  public async initialize(): Promise<void> {
    logger.info(
      bilingualMsg(
        `初始化OSS管理器, 提供商: ${this.config.provider}`,
        `Initializing OSS manager, provider: ${this.config.provider}`,
      ),
    );
    try {
      const factory = OSSProviderFactory.getInstance();
      this.provider = await factory.createProvider(this.config);
      logger.info(
        bilingualMsg(
          `OSS管理器初始化成功, 提供商: ${this.config.provider}`,
          `OSS manager initialization successful, provider: ${this.config.provider}`,
        ),
      );
    } catch (error) {
      logger.error(
        bilingualMsg(
          `OSS管理器初始化失败, 提供商: ${this.config.provider}`,
          `OSS manager initialization failed, provider: ${this.config.provider}`,
        ),
        error,
      );
      throw error;
    }
  }

  /**
   * 获取当前使用的OSS提供商
   * Get the currently used OSS provider
   */
  public getProvider(): IOSSProvider {
    if (!this.provider) {
      logger.error(
        bilingualMsg(
          "OSS管理器未初始化，请先调用initialize()方法",
          "OSS Manager not initialized. Call initialize() first.",
        ),
      );
      throw new Error("OSS Manager not initialized. Call initialize() first.");
    }
    logger.info(
      bilingualMsg(
        `获取OSS提供商: ${this.config.provider}`,
        `Getting OSS provider: ${this.config.provider}`,
      ),
    );
    return this.provider;
  }

  /**
   * 获取配置信息
   * Get configuration information
   */
  public getConfig(): OSSConfig {
    return { ...this.config };
  }

  /**
   * 更新配置并重新初始化
   * Update configuration and reinitialize
   * @param newConfig 新的配置 New configuration
   */
  public async updateConfig(newConfig: Partial<OSSConfig>): Promise<void> {
    const oldProvider = this.config.provider;
    this.config = { ...this.config, ...newConfig };
    logger.info(
      bilingualMsg(
        `更新OSS配置: ${oldProvider} -> ${this.config.provider}`,
        `Updating OSS configuration: ${oldProvider} -> ${this.config.provider}`,
      ),
    );
    await this.initialize();
    logger.info(
      bilingualMsg("OSS配置更新完成", "OSS configuration update completed"),
    );
  }
}

// 默认的OSS管理器实例
let defaultOSSManager: OSSManager | null = null;

/**
 * 设置默认的OSS配置
 * Set default OSS configuration
 * @param config OSS配置 OSS configuration
 */
export async function setupDefaultOSS(config: OSSConfig): Promise<void> {
  logger.info(
    bilingualMsg(
      `设置默认OSS配置, 提供商: ${config.provider}, 存储桶: ${config.bucket}`,
      `Setting default OSS configuration, provider: ${config.provider}, bucket: ${config.bucket}`,
    ),
  );
  defaultOSSManager = new OSSManager(config);
  try {
    await defaultOSSManager.initialize();
    logger.info(
      bilingualMsg(
        "默认OSS配置设置成功",
        "Default OSS configuration set successfully",
      ),
    );
  } catch (error) {
    logger.error(
      bilingualMsg(
        "设置默认OSS配置失败",
        "Failed to set default OSS configuration",
      ),
      error,
    );
    defaultOSSManager = null;
    throw error;
  }
}

/**
 * 获取默认的OSS管理器
 * Get the default OSS manager
 * @returns OSS管理器实例 OSS manager instance
 */
export function getDefaultOSS(): OSSManager {
  if (!defaultOSSManager) {
    logger.error(
      bilingualMsg(
        "默认OSS未配置，请先调用setupDefaultOSS()方法",
        "Default OSS not configured. Call setupDefaultOSS() first.",
      ),
    );
    throw new Error(
      "Default OSS not configured. Call setupDefaultOSS() first.",
    );
  }
  logger.info(bilingualMsg("获取默认OSS管理器", "Getting default OSS manager"));
  return defaultOSSManager;
}

/**
 * 快速创建OSS配置
 * Quickly create OSS configuration
 * @param provider 提供商名称 Provider name
 * @param bucket 存储桶名称 Bucket name
 * @param options 其他配置选项 Other configuration options
 * @returns OSS配置对象 OSS configuration object
 */
export function createOSSConfig(
  provider: "dogecloud" | "qiniu" | "s3" | "custom",
  bucket: string,
  options: Omit<OSSConfig, "provider" | "bucket"> = {},
): OSSConfig {
  const config = {
    provider,
    bucket,
    ...options,
  };
  logger.info(
    bilingualMsg(
      `创建OSS配置: 提供商=${provider}, 存储桶=${bucket}`,
      `Creating OSS configuration: provider=${provider}, bucket=${bucket}`,
    ),
  );
  return config;
}
