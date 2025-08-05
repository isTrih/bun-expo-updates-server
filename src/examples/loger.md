# 双语日志系统使用指南
# Bilingual Logging System Guide

## 介绍 (Introduction)

本项目实现了一个支持中文和英文双语输出的日志系统，可以根据环境配置自动选择日志语言。
This project implements a logging system that supports both Chinese and English output, which can automatically select the log language based on environment configuration.

## 特性 (Features)

- 支持中文和英文双语日志 (Supports both Chinese and English logs)
- 通过环境变量控制输出语言 (Control output language via environment variables)
- 兼容现有单语言日志代码 (Compatible with existing single-language log code)
- 支持多种日志级别：debug、info、warn、error (Supports multiple log levels: debug, info, warn, error)
- 自动回退机制，当某种语言的消息不存在时会使用另一种语言 (Automatic fallback mechanism when a message in one language is not available)

## 使用方法 (Usage)

### 基本使用 (Basic Usage)

```typescript
import { loggers, bilingualMsg } from '../utils/logger';

// 创建日志器 (Create logger)
const logger = loggers.custom('MyModule');

// 单语言日志 (Single language log)
logger.info('这是一条信息');

// 双语日志 (Bilingual log)
logger.info(bilingualMsg('这是中文信息', 'This is English info'));

// 直接使用对象形式 (Use object form directly)
logger.warn({
  'zh-CN': '这是一条警告信息',
  'en-US': 'This is a warning message'
});
```

### 切换语言 (Switching Languages)

通过设置环境变量 `LOG_LANGUAGE` 来控制日志输出语言：
Control log output language by setting the environment variable `LOG_LANGUAGE`:

```typescript
// 切换到英文 (Switch to English)
process.env.LOG_LANGUAGE = 'en-US';

// 切换到中文 (Switch to Chinese)
process.env.LOG_LANGUAGE = 'zh-CN';
```

### 不同类型的日志器 (Different Types of Loggers)

```typescript
// OSS相关日志 (OSS related logs)
const ossLogger = loggers.oss('Storage');
ossLogger.info(bilingualMsg('OSS存储初始化', 'OSS storage initialized'));

// API相关日志 (API related logs)
const apiLogger = loggers.api('UserRoute');
apiLogger.info(bilingualMsg('处理用户请求', 'Processing user request'));

// 系统日志 (System logs)
const systemLogger = loggers.system();
systemLogger.warn(bilingualMsg('系统警告', 'System warning'));
```

### 错误日志 (Error Logs)

```typescript
// 带有错误对象的日志 (Log with error object)
try {
  // 一些可能抛出错误的代码 (Some code that might throw an error)
  throw new Error('Example error');
} catch (error) {
  logger.error(bilingualMsg('发生错误', 'An error occurred'), error);
}
```

## 运行示例 (Run Examples)

```bash
# 运行示例文件
bun run src/examples/logger-example.ts

# 切换到英文输出
LOG_LANGUAGE=en-US bun run src/examples/logger-example.ts
```

## 实现细节 (Implementation Details)

双语日志系统主要通过以下机制工作：
The bilingual logging system works primarily through the following mechanisms:

1. 使用 `MultiLanguageMessage` 类型来接受字符串或语言映射对象
   Using the `MultiLanguageMessage` type to accept either strings or language mapping objects

2. 根据当前环境配置选择适当的语言
   Selecting the appropriate language based on the current environment configuration

3. 当请求的语言不可用时提供回退机制
   Providing a fallback mechanism when the requested language is unavailable

查看 `src/utils/logger.ts` 了解更多实现细节。
See `src/utils/logger.ts` for more implementation details.

## 注意事项 (Notes)

- 默认语言为中文 (Default language is Chinese)
- 当设置了不支持的语言时，默认回退到中文 (When an unsupported language is set, it defaults to Chinese)
- 日志级别控制仍然通过 `LOG_LEVEL` 和 `DEBUG` 环境变量管理 (Log level control is still managed through the `LOG_LEVEL` and `DEBUG` environment variables)