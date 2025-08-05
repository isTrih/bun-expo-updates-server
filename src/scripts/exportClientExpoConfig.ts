const ExpoConfig = require("@expo/config");
const path = require("path");

// 获取当前语言设置 / Get current language setting
const currentLanguage = process.env.LOG_LANGUAGE || "zh-CN";

/**
 * 输出双语日志 / Output bilingual log
 * @param zhMsg 中文消息 / Chinese message
 * @param enMsg 英文消息 / English message
 * @param type 日志类型 / Log type
 */
function log(
  zhMsg: string,
  enMsg: string,
  type: "log" | "error" | "info" | "warn" = "log",
) {
  const msg = currentLanguage === "en-US" ? enMsg : zhMsg;
  console[type](msg);
}

// 从环境变量获取客户端项目路径，如果未设置则使用默认路径
// Get client project path from environment variables, or use default path if not set
const projectDir =
  process.env.CLIENT_PROJECT_PATH ||
  path.join(__dirname, "..", "..", "expo-updates-client");

// 检查路径是否存在 / Check if path exists
const fs = require("fs");
if (!fs.existsSync(projectDir)) {
  log(
    `错误: 客户端项目路径不存在: ${projectDir}`,
    `Error: Client project path does not exist: ${projectDir}`,
    "error",
  );
  log(
    "请设置环境变量 CLIENT_PROJECT_PATH 指向有效的客户端项目目录",
    "Please set the environment variable CLIENT_PROJECT_PATH to point to a valid client project directory",
    "error",
  );
  log(
    "例如: CLIENT_PROJECT_PATH=/Users/trih/WebstormProjects/timi-ark",
    "Example: CLIENT_PROJECT_PATH=/Users/trih/WebstormProjects/timi-ark",
    "error",
  );
  process.exit(1);
}

const { exp } = ExpoConfig.getConfig(projectDir, {
  skipSDKVersionRequirement: true,
  isPublicConfig: true,
});

console.log(JSON.stringify(exp));
