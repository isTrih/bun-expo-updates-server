#!/usr/bin/env bun
/**
 * TypeScript version of upload script
 * Exports client project and uploads to OSS
 */

import { resolve, dirname, join } from "path";
import { existsSync, mkdirSync, symlinkSync, unlinkSync } from "fs";
import { spawn } from "child_process";
import { file } from "bun";
import { tmpdir } from "os";

// Color codes for output
const COLORS = {
  GREEN: "\x1b[0;32m",
  YELLOW: "\x1b[1;33m",
  RED: "\x1b[0;31m",
  BLUE: "\x1b[0;34m",
  NC: "\x1b[0m", // No Color
};

// Log types
type LogType = "info" | "warn" | "error" | "highlight";

// Get language setting from environment or default to Chinese
const LOG_LANGUAGE = process.env.LOG_LANGUAGE || "zh-CN";

/**
 * Bilingual log function
 */
function log(zhMsg: string, enMsg: string, type: LogType = "info"): void {
  let color = COLORS.NC;

  switch (type) {
    case "info":
      color = COLORS.GREEN;
      break;
    case "warn":
      color = COLORS.YELLOW;
      break;
    case "error":
      color = COLORS.RED;
      break;
    case "highlight":
      color = COLORS.BLUE;
      break;
  }

  const message = LOG_LANGUAGE === "en-US" ? enMsg : zhMsg;
  console.log(`${color}${message}${COLORS.NC}`);
}

/**
 * Execute a shell command and return its output
 */
async function execCommand(
  command: string,
  cwd?: string,
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const [cmd, ...args] = command.split(" ");
    const child = spawn(cmd, args, {
      shell: true,
      cwd: cwd || process.cwd(),
      env: { ...process.env },
    });

    let output = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
      console.log(data.toString().trim());
    });

    child.stderr.on("data", (data) => {
      output += data.toString();
      console.error(data.toString().trim());
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        output,
      });
    });
  });
}

/**
 * Load environment variables from .env file
 */
async function loadEnvFile(envPath: string): Promise<void> {
  if (!existsSync(envPath)) return;

  try {
    log(
      "从 .env 文件加载环境变量...",
      "Loading environment variables from .env file...",
      "warn",
    );

    const content = await Bun.file(envPath).text();
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=");

      if (key && value) {
        process.env[key.trim()] = value.trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch (err) {
    log(
      `加载环境变量失败: ${err}`,
      `Failed to load environment variables: ${err}`,
      "error",
    );
  }
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copy directory recursively using Bun
 */
async function copyDir(source: string, destination: string): Promise<boolean> {
  try {
    await execCommand(`cp -r ${source}/* ${destination}`);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Main function to run the upload process
 */
async function main() {
  try {
    // Get the absolute path of the server directory
    const scriptDir = dirname(import.meta.path);
    const SERVER_DIR = resolve(scriptDir, "../..");

    // Load .env file
    const ENV_FILE = join(SERVER_DIR, ".env");
    await loadEnvFile(ENV_FILE);

    // Get client project path from environment variable or use default
    const CLIENT_PROJECT_PATH =
      process.env.CLIENT_PROJECT_PATH ||
      join(SERVER_DIR, "../expo-updates-client");

    // Check if client project path exists
    if (!existsSync(CLIENT_PROJECT_PATH)) {
      log(
        `错误: 客户端项目路径不存在: ${CLIENT_PROJECT_PATH}`,
        `Error: Client project path does not exist: ${CLIENT_PROJECT_PATH}`,
        "error",
      );
      log(
        "请通过以下方式设置有效的客户端项目目录:",
        "Please set a valid client project directory using one of the following methods:",
        "warn",
      );
      log(
        "1. 在 .env 文件中添加: CLIENT_PROJECT_PATH=/path/to/client",
        "1. Add in .env file: CLIENT_PROJECT_PATH=/path/to/client",
        "warn",
      );
      log(
        "2. 或使用环境变量: CLIENT_PROJECT_PATH=/path/to/client bun src/scripts/upload.ts",
        "2. Or use environment variable: CLIENT_PROJECT_PATH=/path/to/client bun src/scripts/upload.ts",
        "warn",
      );
      process.exit(1);
    }

    log(
      "=====================================",
      "=====================================",
      "highlight",
    );
    log(
      "    开始导出 Expo 客户端项目        ",
      "    Starting to export Expo client project    ",
      "highlight",
    );
    log(
      "=====================================",
      "=====================================",
      "highlight",
    );

    log(
      `使用的客户端项目路径: ${CLIENT_PROJECT_PATH}`,
      `Using client project path: ${CLIENT_PROJECT_PATH}`,
      "info",
    );

    // Get runtimeVersion
    log(
      "获取客户端项目的runtimeVersion...",
      "Getting client project's runtimeVersion...",
      "warn",
    );

    // Create temporary file to store configuration
    const tempConfigPath = join(tmpdir(), `expo-config-${Date.now()}.json`);

    // Get the client's Expo configuration
    process.env.CLIENT_PROJECT_PATH = CLIENT_PROJECT_PATH;
    const exportConfigResult = await execCommand(
      `bun ${SERVER_DIR}/src/scripts/exportClientExpoConfig.ts`,
    );

    if (!exportConfigResult.success) {
      log(
        "获取客户端Expo配置失败!",
        "Failed to get client Expo configuration!",
        "error",
      );
      process.exit(1);
    }

    // Parse the output to get the runtimeVersion
    const expoConfig = JSON.parse(exportConfigResult.output);
    const RUNTIME_VERSION = expoConfig.runtimeVersion;

    if (!RUNTIME_VERSION) {
      log(
        "错误: 无法从客户端项目获取runtimeVersion",
        "Error: Cannot get runtimeVersion from client project",
        "error",
      );
      log(
        "请确保客户端项目的app.json中包含expo.runtimeVersion字段",
        "Please make sure the client project's app.json contains the expo.runtimeVersion field",
        "warn",
      );
      process.exit(1);
    }

    log(
      `提取的runtimeVersion: ${RUNTIME_VERSION}`,
      `Extracted runtimeVersion: ${RUNTIME_VERSION}`,
      "info",
    );

    // Generate timestamp
    const TIMESTAMP = Math.floor(Date.now() / 1000).toString();

    // Create directory path
    const DIRECTORY = `${RUNTIME_VERSION}/${TIMESTAMP}`;
    log(
      `生成的时间戳: ${TIMESTAMP}`,
      `Generated timestamp: ${TIMESTAMP}`,
      "info",
    );
    log(
      `导出目标目录: updates/${DIRECTORY}/`,
      `Export target directory: updates/${DIRECTORY}/`,
      "info",
    );

    // Switch to client project directory and execute Expo export
    log(
      "切换到客户端项目目录并执行 bun expo export...",
      "Switching to client project directory and executing bun expo export...",
      "warn",
    );

    const exportResult = await execCommand(
      "bun expo export",
      CLIENT_PROJECT_PATH,
    );

    if (!exportResult.success) {
      log("Expo导出失败!", "Expo export failed!", "error");
      process.exit(1);
    }

    // Create target directory
    const targetDir = join(SERVER_DIR, "updates", DIRECTORY);
    ensureDir(targetDir);

    // Copy newly exported content
    log("复制新导出内容...", "Copying newly exported content...", "warn");
    const sourceDir = join(CLIENT_PROJECT_PATH, "dist");

    const copyResult = await copyDir(sourceDir, targetDir);
    if (!copyResult) {
      log("复制导出内容失败!", "Failed to copy exported content!", "error");
      process.exit(1);
    }

    // Export Expo configuration
    log("导出Expo配置...", "Exporting Expo configuration...", "warn");
    const configFilePath = join(targetDir, "expoConfig.json");
    await Bun.write(configFilePath, JSON.stringify(expoConfig, null, 2));

    // Create or update latest symbolic link
    log("更新latest符号链接...", "Updating latest symbolic link...", "warn");

    // Ensure runtimeVersion directory exists
    const runtimeVersionDir = join(SERVER_DIR, "updates", RUNTIME_VERSION);
    ensureDir(runtimeVersionDir);

    // Handle the symbolic link
    const latestLinkPath = join(runtimeVersionDir, "latest");

    try {
      // Remove old symbolic link if it exists
      if (existsSync(latestLinkPath)) {
        unlinkSync(latestLinkPath);
      }

      // Create new symbolic link (relative path)
      process.chdir(runtimeVersionDir);
      symlinkSync(TIMESTAMP, "latest");
      process.chdir(SERVER_DIR);
    } catch (err) {
      log(
        `警告: 无法创建latest符号链接: ${err}`,
        `Warning: Cannot create latest symbolic link: ${err}`,
        "warn",
      );
    }

    log(
      "=====================================",
      "=====================================",
      "highlight",
    );
    log(
      `导出完成! 文件已保存到: updates/${DIRECTORY}/`,
      `Export completed! Files saved to: updates/${DIRECTORY}/`,
      "info",
    );
    log(
      `最新版本链接: updates/${RUNTIME_VERSION}/latest/`,
      `Latest version link: updates/${RUNTIME_VERSION}/latest/`,
      "info",
    );
    log(
      "=====================================",
      "=====================================",
      "highlight",
    );

    // Upload updates to OSS
    log(
      "=====================================",
      "=====================================",
      "highlight",
    );
    log(
      "开始上传更新文件到 OSS...",
      "Starting to upload update files to OSS...",
      "warn",
    );
    log(
      "=====================================",
      "=====================================",
      "highlight",
    );

    // Set environment variables for the upload script
    process.env.RUNTIME_VERSION = RUNTIME_VERSION;
    process.env.TIMESTAMP = TIMESTAMP;

    // Execute upload script
    const uploadResult = await execCommand(
      `bun ${SERVER_DIR}/src/scripts/uploadUpdatesToOSS.ts`,
    );

    if (!uploadResult.success) {
      log(
        "上传更新文件到OSS失败!",
        "Failed to upload update files to OSS!",
        "error",
      );
      log(
        `您可以稍后手动运行: RUNTIME_VERSION=${RUNTIME_VERSION} TIMESTAMP=${TIMESTAMP} bun ${SERVER_DIR}/src/scripts/uploadUpdatesToOSS.ts`,
        `You can run manually later: RUNTIME_VERSION=${RUNTIME_VERSION} TIMESTAMP=${TIMESTAMP} bun ${SERVER_DIR}/src/scripts/uploadUpdatesToOSS.ts`,
        "warn",
      );
    }

    log(
      "=====================================",
      "=====================================",
      "highlight",
    );
    log("部署流程完成", "Deployment process completed", "info");
    log(
      "=====================================",
      "=====================================",
      "highlight",
    );
  } catch (err) {
    log(
      `脚本执行过程中发生错误: ${err}`,
      `Error occurred during script execution: ${err}`,
      "error",
    );
    process.exit(1);
  }
}

// Run the main function
main();
