#!/bin/bash
# 导出客户端项目的脚本 / Script to export client project
# 使用/Usage: ./export-client.sh
# 自动使用客户端项目的expo.runtimeVersion和当前时间戳创建目录结构 / Automatically creates directory structure using client project's expo.runtimeVersion and current timestamp: updates/runtimeVersion/timestamp
# 在.env文件中设置CLIENT_PROJECT_PATH指定客户端项目路径 / Set CLIENT_PROJECT_PATH in .env file to specify client project path

# 显示彩色输出 / Display colored output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取当前语言设置 / Get current language setting
LOG_LANGUAGE=${LOG_LANGUAGE:-"zh-CN"}

# 双语日志函数 / Bilingual log function
log() {
  local zh_msg="$1"
  local en_msg="$2"
  local type="$3"
  local color="$NC"

  case "$type" in
    "info") color="$GREEN" ;;
    "warn") color="$YELLOW" ;;
    "error") color="$RED" ;;
    "highlight") color="$BLUE" ;;
  esac

  if [ "$LOG_LANGUAGE" = "en-US" ]; then
    echo -e "${color}${en_msg}${NC}"
  else
    echo -e "${color}${zh_msg}${NC}"
  fi
}

# 获取服务器根目录的绝对路径 (脚本位于src/scripts目录下) / Get the absolute path of the server root directory (script is in src/scripts directory)
SERVER_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# 加载.env文件（如果存在） / Load .env file (if exists)
ENV_FILE="$SERVER_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    log "从 .env 文件加载环境变量..." "Loading environment variables from .env file..." "warn"
    # 使用export将.env文件的变量导出到当前shell / Export variables from .env file to current shell
    export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# 从环境变量获取客户端项目路径，如果未设置则使用默认路径 / Get client project path from environment variable, or use default path if not set
CLIENT_PROJECT_PATH=${CLIENT_PROJECT_PATH:-"$SERVER_DIR/../expo-updates-client"}

# 检查客户端项目路径是否存在 / Check if client project path exists
if [ ! -d "$CLIENT_PROJECT_PATH" ]; then
    log "错误: 客户端项目路径不存在: ${CLIENT_PROJECT_PATH}" "Error: Client project path does not exist: ${CLIENT_PROJECT_PATH}" "error"
    log "请通过以下方式设置有效的客户端项目目录:" "Please set a valid client project directory using one of the following methods:" "warn"
    log "1. 在 .env 文件中添加: CLIENT_PROJECT_PATH=/path/to/client" "1. Add in .env file: CLIENT_PROJECT_PATH=/path/to/client" "warn"
    log "2. 或使用环境变量: CLIENT_PROJECT_PATH=/path/to/client ./export-client.sh" "2. Or use environment variable: CLIENT_PROJECT_PATH=/path/to/client ./export-client.sh" "warn"
    exit 1
fi

log "=====================================" "=====================================" "highlight"
log "    开始导出 Expo 客户端项目        " "    Starting to export Expo client project    " "highlight"
log "=====================================" "=====================================" "highlight"

log "使用的客户端项目路径: ${CLIENT_PROJECT_PATH}" "Using client project path: ${CLIENT_PROJECT_PATH}" "info"

# 获取runtimeVersion (在导出Expo前先获取) / Get runtimeVersion (before exporting Expo)
log "获取客户端项目的runtimeVersion..." "Getting client project's runtimeVersion..." "warn"
# 创建临时文件存储配置 / Create temporary file to store configuration
TEMP_CONFIG_FILE=$(mktemp)
CLIENT_PROJECT_PATH="$CLIENT_PROJECT_PATH" bun "$SERVER_DIR/src/scripts/exportClientExpoConfig.ts" > "$TEMP_CONFIG_FILE" || {
    log "获取客户端Expo配置失败!" "Failed to get client Expo configuration!" "error"
    rm -f "$TEMP_CONFIG_FILE"
    exit 1
}

# 从临时文件中提取runtimeVersion (不依赖jq) / Extract runtimeVersion from temporary file (no dependency on jq)
RUNTIME_VERSION=$(grep -o '"runtimeVersion":[^,}]*' "$TEMP_CONFIG_FILE" | cut -d':' -f2 | tr -d '" ')

# 清理临时文件 / Clean up temporary file
rm -f "$TEMP_CONFIG_FILE"

if [ -z "$RUNTIME_VERSION" ]; then
    log "错误: 无法从客户端项目获取runtimeVersion" "Error: Cannot get runtimeVersion from client project" "error"
    log "请确保客户端项目的app.json中包含expo.runtimeVersion字段" "Please make sure the client project's app.json contains the expo.runtimeVersion field" "warn"
    exit 1
fi

log "提取的runtimeVersion: ${RUNTIME_VERSION}" "Extracted runtimeVersion: ${RUNTIME_VERSION}" "info"

# 生成时间戳 / Generate timestamp
TIMESTAMP=$(date +%s)

# 创建目录路径 / Create directory path
DIRECTORY="$RUNTIME_VERSION/$TIMESTAMP"
log "生成的时间戳: ${TIMESTAMP}" "Generated timestamp: ${TIMESTAMP}" "info"
log "导出目标目录: updates/${DIRECTORY}/" "Export target directory: updates/${DIRECTORY}/" "info"

# 切换到客户端项目目录 / Switch to client project directory
log "切换到客户端项目目录..." "Switching to client project directory..." "warn"
cd "$CLIENT_PROJECT_PATH" || {
    log "无法切换到客户端项目目录: $CLIENT_PROJECT_PATH" "Cannot switch to client project directory: $CLIENT_PROJECT_PATH" "error"
    exit 1
}

# 执行Expo导出 / Execute Expo export
log "执行 bun expo export..." "Executing bun expo export..." "warn"
bun expo export || {
    log "Expo导出失败!" "Expo export failed!" "error"
    exit 1
}

# 切换回服务器目录 / Switch back to server directory
log "切换回服务器目录..." "Switching back to server directory..." "warn"
cd "$SERVER_DIR" || {
    log "无法切换回服务器目录: $SERVER_DIR" "Cannot switch back to server directory: $SERVER_DIR" "error"
    exit 1
}

# 创建目标目录（如果不存在） / Create target directory (if it doesn't exist)
mkdir -p "updates/$DIRECTORY/" || {
    log "无法创建目标目录: updates/$DIRECTORY/" "Cannot create target directory: updates/$DIRECTORY/" "error"
    exit 1
}

# 复制新导出内容 / Copy newly exported content
log "复制新导出内容..." "Copying newly exported content..." "warn"
cp -r "$CLIENT_PROJECT_PATH/dist/"* "updates/$DIRECTORY/" || {
    log "复制导出内容失败!" "Failed to copy exported content!" "error"
    exit 1
}

# 导出Expo配置 / Export Expo configuration
log "导出Expo配置..." "Exporting Expo configuration..." "warn"
CLIENT_PROJECT_PATH="$CLIENT_PROJECT_PATH" bun "$SERVER_DIR/src/scripts/exportClientExpoConfig.ts" > "updates/$DIRECTORY/expoConfig.json" || {
    log "导出Expo配置失败!" "Failed to export Expo configuration!" "error"
    exit 1
}

# 创建或更新latest符号链接 / Create or update latest symbolic link
log "更新latest符号链接..." "Updating latest symbolic link..." "warn"
# 确保runtimeVersion目录存在 / Ensure runtimeVersion directory exists
mkdir -p "updates/$RUNTIME_VERSION/"
# 删除旧的符号链接（如果存在） / Delete old symbolic link (if exists)
if [ -L "updates/$RUNTIME_VERSION/latest" ]; then
    rm "updates/$RUNTIME_VERSION/latest"
fi
# 创建新的符号链接（相对路径） / Create new symbolic link (relative path)
(cd "updates/$RUNTIME_VERSION/" && ln -sf "$TIMESTAMP" "latest") || {
    log "警告: 无法创建latest符号链接" "Warning: Cannot create latest symbolic link" "warn"
}

log "=====================================" "=====================================" "highlight"
log "导出完成! 文件已保存到: updates/$DIRECTORY/" "Export completed! Files saved to: updates/$DIRECTORY/" "info"
log "最新版本链接: updates/$RUNTIME_VERSION/latest/" "Latest version link: updates/$RUNTIME_VERSION/latest/" "info"
log "=====================================" "=====================================" "highlight"

# 上传更新到OSS / Upload updates to OSS
log "=====================================" "=====================================" "highlight"
log "开始上传更新文件到 OSS..." "Starting to upload update files to OSS..." "warn"
log "=====================================" "=====================================" "highlight"

# 设置环境变量供上传脚本使用
export RUNTIME_VERSION="$RUNTIME_VERSION"
export TIMESTAMP="$TIMESTAMP"

# 执行上传脚本 / Execute upload script
bun "$SERVER_DIR/src/scripts/uploadUpdatesToOSS.ts" || {
    log "上传更新文件到OSS失败!" "Failed to upload update files to OSS!" "error"
    log "您可以稍后手动运行: RUNTIME_VERSION=$RUNTIME_VERSION TIMESTAMP=$TIMESTAMP bun $SERVER_DIR/src/scripts/uploadUpdatesToOSS.ts" "You can run manually later: RUNTIME_VERSION=$RUNTIME_VERSION TIMESTAMP=$TIMESTAMP bun $SERVER_DIR/src/scripts/uploadUpdatesToOSS.ts" "warn"
}

log "=====================================" "=====================================" "highlight"
log "部署流程完成" "Deployment process completed" "info"
log "=====================================" "=====================================" "highlight"
