# 故障排除

本页面提供 Bun Expo Updates Server 可能遇到的常见问题及其解决方案。

## 常见错误和解决方案

### 服务器启动问题

#### "无法连接到 Redis" 错误

**症状**：服务器启动时显示 `无法连接到 Redis` 或 `Connection refused` 错误。

**解决方案**：
1. 确认 Redis 服务正在运行：
   ```bash
   redis-cli ping
   ```
2. 检查 `.env` 文件中的 `REDIS_URL` 配置是否正确
3. 确认网络防火墙没有阻止 Redis 连接
4. 如果使用的是远程 Redis，检查认证信息是否正确

#### "地址已被使用" 错误

**症状**：启动服务器时显示 `Address already in use` 错误。

**解决方案**：
1. 检查配置的端口是否已被其他进程使用：
   ```bash
   lsof -i :3001
   ```
2. 更改 `.env` 文件中的 `port` 配置
3. 终止占用端口的进程或选择不同的端口

#### "未找到私钥文件" 错误

**症状**：服务器启动时显示 `未找到私钥文件` 错误。

**解决方案**：
1. 确认私钥文件存在于指定的路径：
   ```bash
   ls -la code-sign-keys/private-key.pem
   ```
2. 如果文件不存在，生成新的密钥对：
   ```bash
   mkdir -p code-sign-keys
   openssl genrsa -out code-sign-keys/private-key.pem 2048
   openssl rsa -in code-sign-keys/private-key.pem -pubout -out code-sign-keys/public-key.pem
   ```
3. 更新 `.env` 文件中的 `PRIVATE_KEY_PATH` 配置

### 更新管理问题

#### "找不到运行时版本目录" 错误

**症状**：上传更新时显示 `找不到运行时版本目录` 错误。

**解决方案**：
1. 确认客户端项目路径配置正确：
   ```bash
   echo $CLIENT_PROJECT_PATH
   ```
2. 检查客户端项目的 `app.json` 或 `app.config.js` 文件是否包含 `runtimeVersion` 字段
3. 手动创建运行时版本目录：
   ```bash
   mkdir -p updates/your-runtime-version/$(date +%s)
   ```

#### 更新未显示在应用中

**症状**：更新已成功上传，但客户端应用无法看到或下载更新。

**解决方案**：
1. 检查客户端应用中配置的更新 URL 是否正确
2. 确认客户端应用的运行时版本与服务器上的更新匹配
3. 验证更新资源是否已成功上传到 OSS：
   ```bash
   bun src/scripts/checkUpdateResources.ts
   ```
4. 检查服务器日志，查找请求错误
5. 确认更新文件的 MIME 类型设置正确

#### 时间戳目录结构错误

**症状**：更新目录结构异常或符号链接失败。

**解决方案**：
1. 手动修复目录结构：
   ```bash
   cd updates/your-runtime-version/
   rm -f latest
   ln -sf your-timestamp latest
   ```
2. 重新运行上传脚本：
   ```bash
   bun up
   ```
3. 检查文件系统权限

### OSS 相关问题

#### "OSS 凭证错误" 问题

**症状**：上传更新到 OSS 时显示凭证错误或权限被拒绝。

**解决方案**：
1. 检查 `.env` 文件中的 OSS 凭证：
   ```bash
   cat .env | grep OSS
   ```
2. 确认凭证具有适当的权限（读写权限）
3. 验证存储桶名称和区域配置
4. 使用提供商的官方工具测试凭证

#### "上传超时" 问题

**症状**：上传文件到 OSS 时出现超时错误。

**解决方案**：
1. 检查网络连接和带宽
2. 对大文件使用分块上传
3. 选择更靠近服务器的 OSS 区域
4. 增加超时配置

#### MIME 类型错误

**症状**：文件上传到 OSS 后，MIME 类型不正确，导致资源无法正确加载。

**解决方案**：
1. 使用 `updateMime.ts` 脚本修复 MIME 类型：
   ```bash
   bun src/scripts/updateMime.ts
   ```
2. 确认 `helper-oss.ts` 中的 MIME 类型映射正确
3. 手动设置特定文件的内容类型

### 客户端应用问题

#### 应用无法下载更新

**症状**：客户端应用报告无法下载或应用更新。

**解决方案**：
1. 确认客户端应用有网络连接
2. 验证更新 URL 配置正确
3. 检查客户端运行时版本是否与服务器上的更新匹配
4. 如果启用了代码签名，确保公钥配置正确：
   ```json
   {
     "expo": {
       "updates": {
         "codeSigningPublicKeyBase64": "您的公钥（Base64编码）"
       }
     }
   }
   ```

#### 更新后应用崩溃

**症状**：应用下载并应用更新后崩溃。

**解决方案**：
1. 检查更新包中 JavaScript 代码是否有错误
2. 确认更新与当前运行时版本兼容
3. 回滚到之前的稳定更新：
   ```bash
   cd updates/your-runtime-version/
   rm -f latest
   ln -sf previous-stable-timestamp latest
   ```
4. 检查客户端应用日志以获取详细错误信息

## 日志和调试

### 启用详细日志

要获取更详细的日志信息，设置环境变量：

```bash
DEBUG=true LOG_LANGUAGE=zh-CN bun run dev
```

### 检查服务器日志

服务器日志存储在 `logs/` 目录中：

```bash
tail -f logs/server.log
```

### 测试 API 端点

使用 curl 测试 API 端点：

```bash
# 测试清单端点
curl -H "expo-protocol-version: 1" \
     -H "expo-platform: ios" \
     -H "expo-runtime-version: 1.0.0" \
     http://localhost:3001/api/manifest

# 测试健康检查
curl http://localhost:3001/health
```

## 常见问题（FAQ）

### 服务器在生产环境中需要哪些最低资源？

对于中小型应用（几千用户），建议：
- 1 CPU 核心
- 512MB 内存
- 连接到 Redis 实例
- 足够的磁盘空间来存储更新文件（或使用 OSS）

### 如何管理多个应用的更新？

每个应用应该使用不同的运行时版本标识符，确保它们的更新独立管理。您可以使用相同的服务器实例为多个应用提供更新。

### 可以在不重新发布应用的情况下更改更新服务器 URL 吗？

不可以，更新服务器 URL 是在构建时配置的，需要重新发布应用才能更改。

### 服务器支持回滚到特定版本吗？

是的，您可以通过更改"latest"符号链接指向特定的时间戳目录来实现回滚：

```bash
cd updates/your-runtime-version/
rm -f latest
ln -sf target-timestamp latest
```

### 如何监控服务器的健康状况？

1. 定期检查 `/health` 端点
2. 实现服务器指标监控（如 Prometheus）
3. 设置日志分析和告警
4. 监控 OSS 存储使用情况和配额

## 联系支持

如果您在解决问题时需要帮助，可以：

1. 在 GitHub 仓库提交 Issue：[https://github.com/isTrih/bun-expo-updates-server/issues](https://github.com/isTrih/bun-expo-updates-server/issues)
2. 查阅 [Expo Updates 协议文档](https://docs.expo.dev/technical-specs/expo-updates-0)