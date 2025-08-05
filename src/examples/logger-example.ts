/**
 * 双语日志使用示例
 * Bilingual logging examples
 */
import { loggers, bilingualMsg } from '../utils/logger';

// 创建一个自定义模块的日志器
// Create a logger for a custom module
const logger = loggers.custom('Example');

// 演示不同日志级别的输出
// Demonstrate output at different log levels
async function demonstrateLogging() {
  console.log('\n===== 双语日志演示 Bilingual Logging Demo =====\n');

  // 1. 单语言日志 (兼容旧代码)
  // Single language logging (backward compatible)
  logger.info('这是一条单语言信息日志');
  logger.warn('这是一条单语言警告日志');

  // 2. 使用便捷函数创建双语日志
  // Using helper function to create bilingual logs
  logger.info(bilingualMsg(
    '这是使用辅助函数创建的中文信息',
    'This is English info created with helper function'
  ));

  // 3. 直接使用对象形式的双语日志
  // Using object form directly for bilingual logs
  logger.warn({
    'zh-CN': '这是一条警告信息 - 直接使用对象形式',
    'en-US': 'This is a warning message - using object form directly'
  });

  logger.error({
    'zh-CN': '这是一条错误信息',
    'en-US': 'This is an error message'
  }, new Error('示例错误 Example error'));

  // 4. 切换语言输出
  // Switch language output
  console.log('\n===== 切换到英文输出 Switch to English output =====\n');
  process.env.LOG_LANGUAGE = 'en-US';

  // 重复输出相同的日志，但此时会以英文显示
  // Output the same logs but now they'll be displayed in English
  logger.info(bilingualMsg(
    '这条信息将以英文显示',
    'This info will be displayed in English'
  ));

  logger.warn({
    'zh-CN': '这条警告将以英文显示',
    'en-US': 'This warning will be displayed in English'
  });

  // 5. 测试回退机制 - 只提供一种语言
  // Test fallback mechanism - only providing one language
  logger.info({
    'en-US': 'Only English message is provided (Chinese will fall back to this)'
  });

  logger.warn({
    'zh-CN': '只提供了中文消息（英文会回退到这条）'
  });

  // 6. 切回中文
  // Switch back to Chinese
  console.log('\n===== 切回中文输出 Switch back to Chinese output =====\n');
  process.env.LOG_LANGUAGE = 'zh-CN';

  logger.info(bilingualMsg(
    '现在又切换回中文显示了',
    'Now switched back to Chinese display'
  ));
}

// 运行演示
// Run demonstration
demonstrateLogging().then(() => {
  console.log('\n===== 双语日志演示结束 End of Bilingual Logging Demo =====\n');
});

// 使用不同类型的日志器
// Using different types of loggers
export function demonstrateDifferentLoggers() {
  const ossLogger = loggers.oss('Storage');
  const apiLogger = loggers.api('UserRoute');
  const systemLogger = loggers.system();

  ossLogger.info(bilingualMsg(
    'OSS存储模块初始化完成',
    'OSS storage module initialization completed'
  ));

  apiLogger.info(bilingualMsg(
    '用户API路由处理请求',
    'User API route handling request'
  ));

  systemLogger.warn(bilingualMsg(
    '系统资源使用率较高',
    'System resource usage is high'
  ));
}
