import path from "path";
import fs from "fs";
import mime from "mime-types";
import { uploadFileAsync } from "../utils/helper-oss";
import { setupDefaultOSS } from "../utils/oss-provider/factory";
import { loggers } from "../utils/logger";
const logger = loggers.system();

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
): void {
  const msg = currentLanguage === "en-US" ? enMsg : zhMsg;
  console[type](msg);
}

/**
 * 获取文件的MIME类型
 * @param filePath 文件路径
 * @returns 对应的MIME类型
 */
function getContentType(filePath: string): string {
  // 特定文件的内容类型映射
  const contentTypeMap: Record<string, string> = {
    "manifest.json": "application/json",
    "expoConfig.json": "application/json",
    "index.js": "application/javascript",
    "app.js": "application/javascript",
  };

  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // 优先检查特定文件名映射
  if (contentTypeMap[fileName]) {
    return contentTypeMap[fileName];
  }

  // 使用mime-types库获取内容类型
  const mimeType = mime.lookup(filePath);
  if (mimeType) {
    return mimeType;
  }

  // 根据扩展名判断常见类型
  switch (ext) {
    case ".js":
      return "application/javascript";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    case ".ttf":
      return "font/ttf";
    case ".otf":
      return "font/otf";
    case ".html":
      return "text/html";
    case ".css":
      return "text/css";
    default:
      return "application/octet-stream"; // 默认二进制流
  }
}

/**
 * 上传单个文件到OSS
 * Upload single file to OSS
 * @param filePath 本地文件路径 / Local file path
 * @param ossKey OSS目标路径 / OSS target path
 */
async function uploadSingleFileAsync(
  filePath: string,
  ossKey: string,
): Promise<void> {
  try {
    // 读取文件内容
    const fileContent = await fs.promises.readFile(filePath);

    // 获取内容类型
    const contentType = getContentType(filePath);

    log(
      `\x1b[32m[INFO]\x1b[0m 上传文件: ${filePath} -> ${ossKey} (ContentType: ${contentType})`,
      `\x1b[32m[INFO]\x1b[0m Uploading file: ${filePath} -> ${ossKey} (ContentType: ${contentType})`,
      "log",
    );

    // 上传文件到OSS
    await uploadFileAsync(ossKey, fileContent, contentType);

    log(
      `\x1b[32m[INFO]\x1b[0m ✅ 文件上传成功: ${ossKey}`,
      `\x1b[32m[INFO]\x1b[0m ✅ File uploaded successfully: ${ossKey}`,
      "log",
    );
  } catch (error) {
    log(
      `\x1b[31m[ERROR]\x1b[0m ❌ 上传文件失败: ${filePath} -> ${ossKey}`,
      `\x1b[31m[ERROR]\x1b[0m ❌ Failed to upload file: ${filePath} -> ${ossKey}`,
      "error",
    );
    console.error(error);
    throw error;
  }
}

/**
 * 递归上传目录内所有文件到OSS
 * Recursively upload all files in directory to OSS
 * @param localDirPath 本地目录路径 / Local directory path
 * @param ossBasePath OSS上的基础路径 / Base path on OSS
 */
async function uploadDirectoryAsync(
  localDirPath: string,
  ossBasePath: string,
): Promise<void> {
  try {
    log(
      `\x1b[32m[INFO]\x1b[0m 开始上传目录: ${localDirPath} -> ${ossBasePath}`,
      `\x1b[32m[INFO]\x1b[0m Starting to upload directory: ${localDirPath} -> ${ossBasePath}`,
      "log",
    );

    // 获取目录中的所有文件和子目录
    const entries = await fs.promises.readdir(localDirPath, {
      withFileTypes: true,
    });

    // 处理所有文件和目录
    const uploadPromises = entries.map(async (entry) => {
      const localEntryPath = path.join(localDirPath, entry.name);
      // 确保OSS路径使用正斜杠
      const ossKey = path.posix
        .join(ossBasePath, entry.name)
        .replace(/\\/g, "/");

      if (entry.isDirectory()) {
        // 递归处理子目录
        await uploadDirectoryAsync(localEntryPath, ossKey);
      } else if (entry.isFile()) {
        // 上传文件
        await uploadSingleFileAsync(localEntryPath, ossKey);
      }
    });

    await Promise.all(uploadPromises);
    log(
      `\x1b[32m[INFO]\x1b[0m ✅ 目录上传完成: ${localDirPath} -> ${ossBasePath}`,
      `\x1b[32m[INFO]\x1b[0m ✅ Directory upload completed: ${localDirPath} -> ${ossBasePath}`,
      "log",
    );
  } catch (error) {
    log(
      `\x1b[31m[ERROR]\x1b[0m ❌ 上传目录失败: ${localDirPath} -> ${ossBasePath}`,
      `\x1b[31m[ERROR]\x1b[0m ❌ Failed to upload directory: ${localDirPath} -> ${ossBasePath}`,
      "error",
    );
    console.error(error);
    throw error;
  }
}

/**
 * 将更新目录上传到OSS
 * Upload update directory to OSS
 * 使用方式/Usage: bun src/scripts/uploadUpdatesToOSS.ts <runtimeVersion> <timestamp>
 * 如果不提供参数，则尝试获取环境变量 RUNTIME_VERSION 和 TIMESTAMP
 * If no parameters provided, try to get environment variables RUNTIME_VERSION and TIMESTAMP
 */
async function main() {
  // 明确初始化 OSS
  try {
    logger.info(
      currentLanguage === "en-US"
        ? "Initializing OSS manager..."
        : "正在初始化 OSS 管理器...",
    );
    await setupDefaultOSS({
      provider: process.env.OSS_PROVIDER
        ? (process.env.OSS_PROVIDER as "dogecloud" | "qiniu" | "s3" | "custom")
        : "dogecloud",
      accessKey: process.env.OSS_ACCESS_KEY,
      secretKey: process.env.OSS_SECRET_KEY,
      region: process.env.OSS_REGION || "automatic",
      bucket: process.env.OSS_BUCKET,
      endpoint: process.env.OSS_ENDPOINT,
      forcePathStyle: Boolean(Number(process.env.OSS_FORCE_PATH_STYLE)),
    });
    logger.info(
      currentLanguage === "en-US"
        ? "OSS manager initialized successfully"
        : "OSS 管理器初始化成功",
    );
  } catch (error) {
    logger.error(
      currentLanguage === "en-US"
        ? "Failed to initialize OSS manager"
        : "OSS 管理器初始化失败",
      error,
    );
    process.exit(1); // 如果 OSS 初始化失败，直接退出程序
  }
  try {
    // 获取参数
    const args = process.argv.slice(2);
    let runtimeVersion = args[0] || process.env.RUNTIME_VERSION;
    let timestamp = args[1] || process.env.TIMESTAMP;

    // 验证参数
    if (!runtimeVersion || !timestamp) {
      log(
        "\x1b[31m[ERROR]\x1b[0m ❌ 缺少必要参数。使用方式: bun src/scripts/uploadUpdatesToOSS.ts <runtimeVersion> <timestamp>",
        "\x1b[31m[ERROR]\x1b[0m ❌ Missing required parameters. Usage: bun src/scripts/uploadUpdatesToOSS.ts <runtimeVersion> <timestamp>",
        "error",
      );
      log(
        "\x1b[31m[ERROR]\x1b[0m 或者设置环境变量 RUNTIME_VERSION 和 TIMESTAMP",
        "\x1b[31m[ERROR]\x1b[0m Or set environment variables RUNTIME_VERSION and TIMESTAMP",
        "error",
      );
      process.exit(1);
    }

    // 构建本地路径和OSS路径
    const serverDir = path.resolve(__dirname, "../..");
    const localUpdatePath = path.join(
      serverDir,
      "updates",
      runtimeVersion,
      timestamp,
    );
    const ossBasePath = `updates/${runtimeVersion}/${timestamp}`;

    // 检查本地目录是否存在
    if (!fs.existsSync(localUpdatePath)) {
      log(
        `\x1b[31m[ERROR]\x1b[0m ❌ 本地更新目录不存在: ${localUpdatePath}`,
        `\x1b[31m[ERROR]\x1b[0m ❌ Local update directory does not exist: ${localUpdatePath}`,
        "error",
      );
      process.exit(1);
    }

    log(
      `\x1b[34m====================================\x1b[0m`,
      `\x1b[34m====================================\x1b[0m`,
      "log",
    );
    log(
      `\x1b[32m[INFO]\x1b[0m 开始上传Expo更新到OSS`,
      `\x1b[32m[INFO]\x1b[0m Starting to upload Expo updates to OSS`,
      "log",
    );
    log(
      `\x1b[32m[INFO]\x1b[0m 从本地目录: ${localUpdatePath}`,
      `\x1b[32m[INFO]\x1b[0m From local directory: ${localUpdatePath}`,
      "log",
    );
    log(
      `\x1b[32m[INFO]\x1b[0m 上传到OSS路径: ${ossBasePath}`,
      `\x1b[32m[INFO]\x1b[0m Upload to OSS path: ${ossBasePath}`,
      "log",
    );
    log(
      `\x1b[34m====================================\x1b[0m`,
      `\x1b[34m====================================\x1b[0m`,
      "log",
    );

    // 上传目录内所有文件到OSS
    await uploadDirectoryAsync(localUpdatePath, ossBasePath);

    log(
      `\x1b[34m====================================\x1b[0m`,
      `\x1b[34m====================================\x1b[0m`,
      "log",
    );
    log(
      `\x1b[32m[INFO]\x1b[0m ✅ 所有文件上传完成!`,
      `\x1b[32m[INFO]\x1b[0m ✅ All files uploaded successfully!`,
      "log",
    );
    log(
      `\x1b[34m====================================\x1b[0m`,
      `\x1b[34m====================================\x1b[0m`,
      "log",
    );
  } catch (error) {
    log(
      "\x1b[31m[ERROR]\x1b[0m ❌ 上传过程中发生错误:",
      "\x1b[31m[ERROR]\x1b[0m ❌ Error occurred during upload:",
      "error",
    );
    console.error(error);
    process.exit(1);
  }
}

// 执行主函数
main();
