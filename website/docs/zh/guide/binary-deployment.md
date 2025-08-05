# 二进制部署与 PM2 管理最佳实践

本文将详细介绍如何使用二进制文件部署 Bun Expo Updates Server，以及如何使用 PM2 进行进程管理，确保服务的高可用性和可靠性。

## 二进制文件部署概述

Bun 提供了将应用程序编译为自包含二进制文件的能力，这种方式具有以下优势：

- **无依赖部署**：编译后的二进制文件包含所有必要的运行时依赖
- **更快的启动速度**：相比解释执行，二进制文件启动更快
- **更低的资源占用**：运行时内存占用更小
- **安全性提升**：源码不直接暴露在生产环境

## 构建二进制文件

### 准备工作

在构建二进制文件前，确保您的开发环境满足以下条件：

- 已安装最新版本的 Bun
- 项目依赖已完全安装
- 已完成所有功能测试

### 构建命令

在项目根目录下运行以下命令来构建二进制文件：

```bash
# 安装依赖
bun install

# 构建二进制文件
# 根据目标服务器环境选择合适的架构
bun build \
    --compile \
    --minify \
    --target bun-linux-x64 \
    --outfile server \
    ./src/index.ts
```

可用的目标架构选项包括：

| 目标架构 | 操作系统 | CPU架构 | `haswell`支持 | `nehalem`支持 |
| --------- | -------- | ------- | :-----------: | :-----------: |
| bun-linux-x64 | Linux | x64 | ✅ | ✅ |
| bun-linux-arm64 | Linux | arm64 | ✅ | N/A |
| bun-darwin-x64 | macOS | x64 | ✅ | ✅ |
| bun-darwin-arm64 | macOS | arm64 | ✅ | N/A |
| bun-windows-x64 | Windows | x64 | ✅ | ✅ |
| ~~bun-windows-arm64~~ | Windows | arm64 | ❌ | ❌ |

### 构建选项说明

- `--compile`：将代码编译为二进制可执行文件
- `--minify`：压缩代码以减小输出文件大小
- `--target`：指定目标平台和架构
- `--outfile`：指定输出文件名
- `./src/index.ts`：入口文件路径

## 使用二进制文件部署

### 直接运行二进制文件

将构建好的二进制文件上传到服务器后，执行以下步骤：

1. **设置可执行权限**：
   ```bash
   chmod +x server
   ```

2. **创建日志目录**：
   ```bash
   mkdir -p logs
   ```

3. **直接启动服务器**：
   ```bash
   ./server
   ```

4. **使用环境变量配置**：
   ```bash
   REDIS_URL="redis://localhost:6379" DEBUG=true port=3001 ./server
   ```

### 使用 systemd 管理（Linux）

对于 Linux 系统，可以使用 systemd 创建服务单元来管理二进制文件：

1. **创建服务单元文件**：

   ```bash
   sudo nano /etc/systemd/system/expo-updates.service
   ```

2. **添加以下内容**：

   ```ini
   [Unit]
   Description=Bun Expo Updates Server
   After=network.target

   [Service]
   Type=simple
   User=your_user
   WorkingDirectory=/path/to/server/directory
   ExecStart=/path/to/server/directory/server
   Restart=on-failure
   RestartSec=10
   StandardOutput=syslog
   StandardError=syslog
   SyslogIdentifier=expo-updates
   Environment=REDIS_URL=redis://localhost:6379
   Environment=DEBUG=true
   Environment=port=3001
   Environment=LOG_LANGUAGE=zh_CN
   Environment=HOSTNAME=https://your-update-domain.com
   # 添加其他必要的环境变量...

   [Install]
   WantedBy=multi-user.target
   ```

3. **启动并启用服务**：

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start expo-updates
   sudo systemctl enable expo-updates
   ```

4. **检查服务状态**：

   ```bash
   sudo systemctl status expo-updates
   ```

## PM2 进程管理

[PM2](https://pm2.keymetrics.io/) 是一个功能强大的 Node.js 应用程序进程管理器，也可用于管理 Bun 应用程序的二进制文件。它提供了进程守护、监控、日志管理等功能。

### 安装 PM2

```bash
npm install -g pm2
```

### 基本 PM2 配置

创建一个 `ecosystem.config.js` 文件来配置 PM2：

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      env: {
        // Redis配置
        // 格式: redis://password@localhost:6379
        "REDIS_URL": "redis://localhost:6379",

        // 日志设置
        // 是否开启调试日志
        "DEBUG": "true",

        // 日志语言设置 (zh_CN/en_US)
        "LOG_LANGUAGE": "zh_CN",

        // OSS 对象存储配置
        // OSS提供商
        "OSS_PROVIDER": "your_oss_provider",

        // OSS访问密钥
        "OSS_ACCESS_KEY": "your_access_key",

        // OSS密钥
        "OSS_SECRET_KEY": "your_secret_key",

        // 是否强制使用路径样式 (0 false, 1 true)
        "OSS_FORCE_PATH_STYLE": "0",

        // OSS区域
        // "OSS_REGION": "your_region",

        // OSS存储桶名称
        // "OSS_BUCKET": "your_bucket",

        // OSS端点
        // "OSS_ENDPOINT": "your_endpoint",

        // 客户端项目路径
        // 客户端项目的本地路径
        "CLIENT_PROJECT_PATH": "/path/to/your/client/project",

        // 私钥路径配置
        // 用于代码签名的私钥路径
        "PRIVATE_KEY_PATH": "code-sign-keys/private-key.pem",

        // 服务端口配置
        // 服务器监听的端口
        "port": "3001",

        // 更新资源下载地址(OSS或CDN)
        // 更新资源的基础URL
        "HOSTNAME": "https://your-update-domain.com"
      }
    }
  ]
};
```

### 使用 PM2 管理应用

#### 启动应用

```bash
pm2 start ecosystem.config.js
```

#### 查看应用状态

```bash
pm2 list
```

输出示例：

```
┌────┬────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name           │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ bun-updates    │ fork     │ 0    │ online    │ 0.5%     │ 50.2 MB  │
└────┴────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

#### 查看日志

```bash
# 查看所有日志
pm2 logs

# 查看特定应用日志
pm2 logs bun-updates
```

#### 监控应用

```bash
pm2 monit
```

这将打开一个交互式界面，显示应用程序的实时指标。

#### 重启应用

```bash
pm2 restart bun-updates
```

#### 停止应用

```bash
pm2 stop bun-updates
```

#### 删除应用

```bash
pm2 delete bun-updates
```

### 设置开机自启动

为确保服务器重启后应用程序自动启动：

```bash
# 生成开机自启动脚本
pm2 startup

# 保存当前运行的应用列表，以便重启后恢复
pm2 save
```

系统会根据您的操作系统生成一个命令，您需要复制并执行该命令。

## PM2 集群模式

虽然 Bun 的二进制文件本身不支持 PM2 的集群模式，但您可以运行多个实例并使用负载均衡器（如 Nginx）分发流量：

### 多实例配置

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      instances: 3,        // 运行3个实例
      exec_mode: "fork",   // 对二进制文件使用fork模式
      env: {
        // ... 环境变量配置
        // 为每个实例设置不同的端口
        "port": "3001,3002,3003"  // PM2会将不同端口分配给不同实例
      }
    }
  ]
};
```

### Nginx 负载均衡配置

```nginx
upstream bun_updates_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name updates.yourdomein.com;

    location / {
        proxy_pass http://bun_updates_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 高级 PM2 功能

### 日志轮转

PM2 内置了日志轮转功能，可以通过以下命令启用：

```bash
pm2 install pm2-logrotate
```

配置日志轮转：

```bash
# 设置日志大小上限（默认10MB）
pm2 set pm2-logrotate:max_size 20M

# 设置保留的最大日志文件数（默认30）
pm2 set pm2-logrotate:retain 7

# 设置轮转频率（默认为每天0点）
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# 设置日志压缩
pm2 set pm2-logrotate:compress true
```

### PM2 Plus 监控

PM2 Plus 提供了更高级的监控和警报功能：

1. 注册 PM2 Plus：
   ```bash
   pm2 register
   ```

2. 将服务器连接到控制台：
   ```bash
   pm2 link
   ```

3. 访问 [PM2 Plus 控制台](https://app.pm2.io/) 查看详细的监控数据。

### 自定义指标监控

您可以设置监控特定的应用指标：

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      env: {
        // ... 环境变量配置
      },
      // 监控配置
      watch: true,
      max_memory_restart: "200M",
      restart_delay: 3000,
      exp_backoff_restart_delay: 100
    }
  ]
};
```

## 性能优化最佳实践

### 内存限制

设置内存使用限制可以防止服务器资源耗尽：

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      max_memory_restart: "300M",  // 内存超过300MB时自动重启
      env: {
        // ... 环境变量配置
      }
    }
  ]
};
```

### 优化启动参数

对于二进制文件，可以通过环境变量优化性能：

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      env: {
        // ... 其他环境变量
        "GC_MAX_HEAP_SIZE": "200"  // 设置最大堆大小（MB）
      }
    }
  ]
};
```

### 健康检查

实现定期健康检查以确保服务正常运行：

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      // 添加健康检查 URL
      exp_backoff_restart_delay: 100,
      wait_ready: true,         // 等待应用发送ready信号
      listen_timeout: 10000,    // 最多等待10秒
      kill_timeout: 3000        // 给进程3秒时间进行清理
    }
  ]
};
```

## 故障排除

### 常见问题与解决方案

1. **二进制文件无法启动**
   - 检查文件权限：`chmod +x server`
   - 验证操作系统兼容性：确保构建目标与服务器环境匹配
   - 检查依赖库：`ldd ./server`（在Linux上）

2. **端口绑定问题**
   - 检查端口是否已被占用：`netstat -tulpn | grep <port>`
   - 尝试使用不同的端口：修改环境变量 `port=3002`

3. **内存泄漏**
   - 使用 `pm2 monit` 监控内存使用情况
   - 设置 `max_memory_restart` 限制，确保问题应用自动重启
   - 考虑增加系统交换空间

4. **PM2 启动错误**
   - 检查 PM2 版本：`pm2 -v`，确保使用最新版本
   - 检查配置文件语法：确保 `ecosystem.config.js` 格式正确
   - 查看详细错误日志：`pm2 logs`

### 常用调试命令

```bash
# 查看详细日志
pm2 logs bun-updates --lines 200

# 查看特定实例日志
pm2 logs bun-updates --lines 50 --timestamp

# 查看进程详情
pm2 show bun-updates

# 检查服务器资源使用情况
pm2 monit
```

## 生产环境部署清单

在生产环境部署前，请检查以下事项：

- [ ] 二进制文件已使用正确的目标架构构建
- [ ] 所有环境变量已正确设置
- [ ] 日志目录已创建并有适当的写入权限
- [ ] PM2 配置已优化（内存限制、日志轮转等）
- [ ] 已设置开机自启动
- [ ] 防火墙已配置允许必要端口访问
- [ ] 健康检查和监控已设置
- [ ] 已准备备份和恢复策略
- [ ] 负载均衡（如适用）已配置
- [ ] SSL证书（如适用）已安装和配置

## 总结

通过本指南，您已了解如何使用二进制文件部署 Bun Expo Updates Server，以及如何使用 PM2 进行高效管理。这种部署方式具有性能优势和简化的依赖管理，使您的更新服务器更加可靠和高效。

正确配置的 PM2 不仅能提供进程管理，还能提供详细的监控和日志管理，是生产环境必不可少的工具。通过遵循本文提供的最佳实践，您可以确保您的 Expo 更新服务器稳定、高效地运行。

## 相关资源

- [PM2 官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Bun 构建文档](https://bun.sh/docs/bundler)
- [Nginx 负载均衡指南](https://nginx.org/en/docs/http/load_balancing.html)
- [Linux 系统服务管理](https://www.digitalocean.com/community/tutorials/how-to-use-systemctl-to-manage-systemd-services-and-units)