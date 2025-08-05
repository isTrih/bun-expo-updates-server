# Expo Updates Server Scripts Documentation

[English](README.en.md) | [中文](README.zh-CN.md)

This README is available in multiple languages. Please click on the links above to access your preferred language version.

此文档有多种语言版本。请点击上方链接访问您偏好的语言版本。

## 1. Scripts Overview / 脚本概述

This directory contains scripts for managing Expo updates deployment and uploading assets to cloud storage (OSS). For detailed documentation, please see the language-specific README files linked above.

此目录包含用于管理 Expo 更新部署和将资源上传到云存储（OSS）的脚本。有关详细文档，请参阅上方链接的特定语言 README 文件。

### upload.ts

A TypeScript script for exporting an Expo client project and deploying the updates to OSS. This script:
- Extracts the runtime version from the client project
- Generates a timestamp for the update
- Exports the Expo project
- Copies the exported files to the updates directory with proper versioning
- Creates or updates the "latest" symlink
- Uploads the update files to OSS
## Available Scripts

The documentation covers the following scripts:

- **upload.ts**: Export and deploy Expo client updates
- **uploadUpdatesToOSS.ts**: Upload files to cloud storage
- **exportClientExpoConfig.ts**: Extract Expo configuration

For complete documentation in your preferred language, please use the links at the top of this page.

可用脚本：

- **upload.ts**: 导出并部署 Expo 客户端更新
- **uploadUpdatesToOSS.ts**: 将文件上传到云存储
- **exportClientExpoConfig.ts**: 提取 Expo 配置

有关完整文档，请使用页面顶部的链接选择您偏好的语言版本。