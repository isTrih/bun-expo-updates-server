/**
 * 通用日志工具模块
 * 提供统一的日志记录接口，支持按模块和级别输出日志
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogLanguage = "zh-CN" | "en-US";
interface LoggerOptions {
  /** 模块名称，将显示在日志前缀中 */
  /** Module Name，showing in log's prefix */
  module: string;

  /** 是否启用调试日志 */
  /** enable log */
  debug?: boolean;

  /** 是否在生产环境中显示非错误日志 */
  /** show DEBUG and INFO in production */
  verbose?: boolean;

  /** 日志语言，默认为中文 */
  /** Log Language，default is Chinese */
  language?: LogLanguage;
}

/**
 * 支持多语言的消息类型
 * Multi-language message type
 */
type MultiLanguageMessage =
  | {
      "zh-CN"?: string;
      "en-US"?: string;
    }
  | string;

/**
 * 检查当前环境是否为生产环境
 */
const isProduction = (): boolean => {
  return process.env.NODE_ENV === "production";
};

/**
 * 检查是否应该输出调试日志
 */
const shouldLogDebug = (): boolean => {
  return process.env.DEBUG_OSS === "true" || process.env.DEBUG === "true";
};

/**
 * 检查是否应该输出信息日志
 */
const shouldLogInfo = (): boolean => {
  return (
    shouldLogDebug() ||
    process.env.LOG_LEVEL === "info" ||
    process.env.LOG_LEVEL === "debug"
  );
};

const currentLanguage = (): LogLanguage => {
  const lang = process.env.LOG_LANGUAGE || "zh-CN";
  return lang === "en-US" ? "en-US" : "zh-CN";
};

/**
 * 创建Logger实例
 */
export function createLogger(options: LoggerOptions) {
  const { module, debug = true, verbose = false } = options;

  const formatDate = (): string => {
    return new Date().toISOString();
  };

  const formatMessage = (level: LogLevel, message: string): string => {
    return `[${formatDate()}][${module}][${level.toUpperCase()}] ${message}`;
  };

  /**
   * 根据当前语言设置选择合适的消息文本
   * Select appropriate message text based on current language settings
   */
  const getMessageForCurrentLanguage = (
    message: MultiLanguageMessage,
  ): string => {
    // 如果是字符串，直接返回
    if (typeof message === "string") {
      return message;
    }

    // 获取当前语言
    const lang = currentLanguage();

    // 如果有当前语言的消息，返回对应语言消息
    if (message[lang]) {
      return message[lang];
    }

    // 回退：如果请求英文但只有中文，或请求中文但只有英文
    const fallbackLang: LogLanguage = lang === "zh-CN" ? "en-US" : "zh-CN";
    if (message[fallbackLang]) {
      return message[fallbackLang];
    }

    // 都没有，返回空字符串
    return "[No message available]";
  };

  return {
    /**
     * 输出调试级别日志
     * 只在开启DEBUG_OSS=true或DEBUG=true时显示
     * Output debug level logs
     * Only displayed when DEBUG_OSS=true or DEBUG=true is enabled
     */
    debug(message: MultiLanguageMessage): void {
      if ((debug && shouldLogDebug()) || process.env.LOG_LEVEL === "debug") {
        console.debug(
          formatMessage("debug", getMessageForCurrentLanguage(message)),
        );
      }
    },

    /**
     * 输出信息级别日志
     * 在DEBUG_OSS=true或非生产环境或verbose=true时显示
     * Output info level logs
     * Displayed when DEBUG_OSS=true or in non-production environment or verbose=true
     */
    info(message: MultiLanguageMessage): void {
      if (
        shouldLogInfo() ||
        (!isProduction() && verbose) ||
        process.env.LOG_LEVEL === "info"
      ) {
        console.log(
          formatMessage("info", getMessageForCurrentLanguage(message)),
        );
      }
    },

    /**
     * 输出警告级别日志
     * 在非生产环境或DEBUG_OSS=true时显示
     * Output warning level logs
     * Displayed in non-production environment or when DEBUG_OSS=true
     */
    warn(message: MultiLanguageMessage): void {
      if (
        !isProduction() ||
        shouldLogDebug() ||
        process.env.LOG_LEVEL === "warn"
      ) {
        console.warn(
          formatMessage("warn", getMessageForCurrentLanguage(message)),
        );
      }
    },

    /**
     * 输出错误级别日志
     * 始终显示，可附加错误对象
     * Output error level logs
     * Always displayed, error object can be attached
     */
    error(message: MultiLanguageMessage, error?: any): void {
      console.error(
        formatMessage("error", getMessageForCurrentLanguage(message)),
        error || "",
      );
    },
  };
}

/**
 * 创建双语消息对象
 * Create bilingual message object
 *
 * @param zhMessage 中文消息内容 Chinese message content
 * @param enMessage 英文消息内容 English message content
 * @returns 双语消息对象 Bilingual message object
 */
export function bilingualMsg(
  zhMessage: string,
  enMessage: string,
): { "zh-CN": string; "en-US": string } {
  return {
    "zh-CN": zhMessage,
    "en-US": enMessage,
  };
}

/**
 * 默认日志配置
 * 可用于快速创建不同模块的日志器
 * Default log configuration
 * Can be used to quickly create loggers for different modules
 */
export const loggers = {
  /**
   * 创建OSS存储相关的日志器
   */
  oss(subModule?: string): ReturnType<typeof createLogger> {
    const moduleName = subModule ? `OSS:${subModule}` : "OSS";
    return createLogger({ module: moduleName });
  },

  /**
   * 创建API相关的日志器
   */
  api(route?: string): ReturnType<typeof createLogger> {
    const moduleName = route ? `API:${route}` : "API";
    return createLogger({ module: moduleName });
  },

  /**
   * 创建系统相关的日志器
   */
  system(): ReturnType<typeof createLogger> {
    return createLogger({ module: "SYSTEM" });
  },

  /**
   * 创建自定义模块的日志器
   */
  custom(moduleName: string): ReturnType<typeof createLogger> {
    return createLogger({ module: moduleName.toUpperCase() });
  },
};

// 导出默认的系统日志器，可直接使用
export default loggers.system();

/**
 * 使用示例：
 * Usage examples:
 *
 * // 导入日志工具 (Import logger utilities)
 * import { loggers, bilingualMsg } from './logger';
 *
 * // 创建日志器 (Create logger)
 * const logger = loggers.custom('MyModule');
 *
 * // 单语言日志 (Single language logging - backward compatible)
 * logger.info('这是一条信息');
 *
 * // 使用双语日志 (Using bilingual logging)
 * logger.info(bilingualMsg('这是中文信息', 'This is English info'));
 *
 * // 也可以直接使用对象 (Can also use object directly)
 * logger.warn({
 *   'zh-CN': '这是一条警告信息',
 *   'en-US': 'This is a warning message'
 * });
 *
 * // 环境变量控制输出语言 (Environment variable controls output language)
 * // process.env.LOG_LANGUAGE = 'en-US';  // 设置为英文 (Set to English)
 * // process.env.LOG_LANGUAGE = 'zh-CN';  // 设置为中文 (Set to Chinese)
 */
