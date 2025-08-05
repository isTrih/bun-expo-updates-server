# Binary Deployment & PM2 Management Best Practices

This guide covers the detailed process of deploying Bun Expo Updates Server using binary files and managing it with PM2 to ensure high availability and reliability of your service.

## Binary Deployment Overview

Bun provides the ability to compile applications into self-contained binary files, offering several advantages:

- **Dependency-free deployment**: The compiled binary includes all necessary runtime dependencies
- **Faster startup times**: Binary files start faster compared to interpreted execution
- **Lower resource usage**: Smaller memory footprint at runtime
- **Enhanced security**: Source code is not directly exposed in the production environment

## Building Binary Files

### Prerequisites

Before building a binary file, ensure your development environment meets the following conditions:

- Latest version of Bun installed
- Project dependencies fully installed
- All functional tests completed

### Build Command

Run the following command in the project root directory to build a binary file:

```bash
# Install dependencies
bun install

# Build the binary file
# Choose the appropriate target for your server architecture
bun build \
    --compile \
    --minify \
    --target bun-linux-x64 \
    --outfile server \
    ./src/index.ts
```

Available target architecture options include:

| Target | Operating System | Architecture | `haswell` support | `nehalem` support |
| ------ | --------------- | ------------ | :--------------: | :--------------: |
| bun-linux-x64 | Linux | x64 | ✅ | ✅ |
| bun-linux-arm64 | Linux | arm64 | ✅ | N/A |
| bun-darwin-x64 | macOS | x64 | ✅ | ✅ |
| bun-darwin-arm64 | macOS | arm64 | ✅ | N/A |
| bun-windows-x64 | Windows | x64 | ✅ | ✅ |
| ~~bun-windows-arm64~~ | Windows | arm64 | ❌ | ❌ |

### Build Options Explained

- `--compile`: Compiles the code into a binary executable
- `--minify`: Compresses the code to reduce output file size
- `--target`: Specifies the target platform and architecture
- `--outfile`: Specifies the output filename
- `./src/index.ts`: Entry file path

## Deploying with Binary Files

### Direct Binary Execution

After uploading the built binary file to your server, follow these steps:

1. **Set executable permissions**:
   ```bash
   chmod +x server
   ```

2. **Create logs directory**:
   ```bash
   mkdir -p logs
   ```

3. **Start the server directly**:
   ```bash
   ./server
   ```

4. **Configure with environment variables**:
   ```bash
   REDIS_URL="redis://localhost:6379" DEBUG=true port=3001 ./server
   ```

### Managing with systemd (Linux)

For Linux systems, you can create a systemd service unit to manage the binary file:

1. **Create a service unit file**:

   ```bash
   sudo nano /etc/systemd/system/expo-updates.service
   ```

2. **Add the following content**:

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
   Environment=LOG_LANGUAGE=en_US
   Environment=HOSTNAME=https://your-update-domain.com
   # Add other necessary environment variables...

   [Install]
   WantedBy=multi-user.target
   ```

3. **Start and enable the service**:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl start expo-updates
   sudo systemctl enable expo-updates
   ```

4. **Check service status**:

   ```bash
   sudo systemctl status expo-updates
   ```

## PM2 Process Management

[PM2](https://pm2.keymetrics.io/) is a powerful Node.js application process manager that can also be used to manage Bun application binary files. It provides process monitoring, logging, and other management features.

### Installing PM2

```bash
npm install -g pm2
```

### Basic PM2 Configuration

Create an `ecosystem.config.js` file to configure PM2:

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      env: {
        // Redis Configuration
        // Format: redis://password@localhost:6379
        "REDIS_URL": "redis://localhost:6379",

        // Log Settings
        // Enable debug logs
        "DEBUG": "true",

        // Log language setting (zh_CN/en_US)
        "LOG_LANGUAGE": "en_US",

        // Object Storage Service Configuration
        // OSS provider
        "OSS_PROVIDER": "your_oss_provider",

        // OSS access key
        "OSS_ACCESS_KEY": "your_access_key",

        // OSS secret key
        "OSS_SECRET_KEY": "your_secret_key",

        // Force path style (0 false, 1 true)
        "OSS_FORCE_PATH_STYLE": "0",

        // OSS region
        // "OSS_REGION": "your_region",

        // OSS bucket name
        // "OSS_BUCKET": "your_bucket",

        // OSS endpoint
        // "OSS_ENDPOINT": "your_endpoint",

        // Client Project Path
        // Local path to the client project
        "CLIENT_PROJECT_PATH": "/path/to/your/client/project",

        // Private Key Path Configuration
        // Path to the private key for code signing
        "PRIVATE_KEY_PATH": "code-sign-keys/private-key.pem",

        // Server Port Configuration
        // Port on which the server listens
        "port": "3001",

        // Update Resource Download URL (OSS or CDN)
        // Base URL for update resources
        "HOSTNAME": "https://your-update-domain.com"
      }
    }
  ]
};
```

### Managing Applications with PM2

#### Starting the Application

```bash
pm2 start ecosystem.config.js
```

#### Viewing Application Status

```bash
pm2 list
```

Example output:

```
┌────┬────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name           │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ bun-updates    │ fork     │ 0    │ online    │ 0.5%     │ 50.2 MB  │
└────┴────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

#### Viewing Logs

```bash
# View all logs
pm2 logs

# View logs for a specific application
pm2 logs bun-updates
```

#### Monitoring Applications

```bash
pm2 monit
```

This opens an interactive interface displaying real-time metrics for your application.

#### Restarting Applications

```bash
pm2 restart bun-updates
```

#### Stopping Applications

```bash
pm2 stop bun-updates
```

#### Removing Applications

```bash
pm2 delete bun-updates
```

### Setting Up Startup Scripts

To ensure your application starts automatically after server reboot:

```bash
# Generate startup script
pm2 startup

# Save the current list of running applications
pm2 save
```

The system will generate a command based on your operating system, which you need to copy and execute.

## PM2 Cluster Mode

While Bun binary files don't support PM2's cluster mode directly, you can run multiple instances and use a load balancer like Nginx to distribute traffic:

### Multiple Instance Configuration

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      instances: 3,        // Run 3 instances
      exec_mode: "fork",   // Use fork mode for binary files
      env: {
        // ... environment variables
        // Set different ports for each instance
        "port": "3001,3002,3003"  // PM2 will assign different ports to different instances
      }
    }
  ]
};
```

### Nginx Load Balancing Configuration

```nginx
upstream bun_updates_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name updates.yourdomain.com;

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

## Advanced PM2 Features

### Log Rotation

PM2 has built-in log rotation that can be enabled with:

```bash
pm2 install pm2-logrotate
```

Configure log rotation:

```bash
# Set maximum log size (default 10MB)
pm2 set pm2-logrotate:max_size 20M

# Set maximum number of logs to keep (default 30)
pm2 set pm2-logrotate:retain 7

# Set rotation frequency (default is at midnight)
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Enable log compression
pm2 set pm2-logrotate:compress true
```

### PM2 Plus Monitoring

PM2 Plus provides more advanced monitoring and alerting:

1. Register with PM2 Plus:
   ```bash
   pm2 register
   ```

2. Link your server to the dashboard:
   ```bash
   pm2 link
   ```

3. Access the [PM2 Plus Dashboard](https://app.pm2.io/) to view detailed monitoring data.

### Custom Metrics Monitoring

You can set up monitoring for specific application metrics:

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      env: {
        // ... environment variables
      },
      // Monitoring settings
      watch: true,
      max_memory_restart: "200M",
      restart_delay: 3000,
      exp_backoff_restart_delay: 100
    }
  ]
};
```

## Performance Optimization Best Practices

### Memory Limits

Setting memory limits prevents server resource exhaustion:

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      max_memory_restart: "300M",  // Restart if memory exceeds 300MB
      env: {
        // ... environment variables
      }
    }
  ]
};
```

### Startup Parameter Optimization

For binary files, you can optimize performance through environment variables:

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      env: {
        // ... other environment variables
        "GC_MAX_HEAP_SIZE": "200"  // Set maximum heap size (MB)
      }
    }
  ]
};
```

### Health Checks

Implement periodic health checks to ensure service is running properly:

```javascript
module.exports = {
  apps: [
    {
      name: "bun-updates",
      script: "./server",
      // Add health check URL
      exp_backoff_restart_delay: 100,
      wait_ready: true,         // Wait for ready signal from app
      listen_timeout: 10000,    // Wait up to 10 seconds
      kill_timeout: 3000        // Give process 3 seconds for cleanup
    }
  ]
};
```

## Troubleshooting

### Common Issues and Solutions

1. **Binary file won't start**
   - Check file permissions: `chmod +x server`
   - Verify OS compatibility: ensure build target matches server environment
   - Check library dependencies: `ldd ./server` (on Linux)

2. **Port binding issues**
   - Check if port is already in use: `netstat -tulpn | grep <port>`
   - Try using a different port: modify the `port` environment variable to `port=3002`

3. **Memory leaks**
   - Monitor memory usage with `pm2 monit`
   - Set `max_memory_restart` limit to ensure problematic apps restart automatically
   - Consider increasing system swap space

4. **PM2 startup errors**
   - Check PM2 version: `pm2 -v`, ensure using the latest version
   - Check configuration file syntax: ensure `ecosystem.config.js` is properly formatted
   - View detailed error logs: `pm2 logs`

### Useful Debugging Commands

```bash
# View detailed logs
pm2 logs bun-updates --lines 200

# View logs with timestamps
pm2 logs bun-updates --lines 50 --timestamp

# View process details
pm2 show bun-updates

# Check server resource usage
pm2 monit
```

## Production Deployment Checklist

Before deploying to production, check the following items:

- [ ] Binary file built with correct target architecture
- [ ] All environment variables properly set
- [ ] Log directory created with appropriate write permissions
- [ ] PM2 configuration optimized (memory limits, log rotation, etc.)
- [ ] Startup scripts configured
- [ ] Firewall configured to allow necessary port access
- [ ] Health checks and monitoring set up
- [ ] Backup and recovery strategy prepared
- [ ] Load balancing (if applicable) configured
- [ ] SSL certificates (if applicable) installed and configured

## Summary

Through this guide, you've learned how to deploy Bun Expo Updates Server using binary files and efficiently manage it with PM2. This deployment method offers performance advantages and simplified dependency management, making your update server more reliable and efficient.

Properly configured PM2 provides not just process management but detailed monitoring and log management, making it an essential tool for production environments. By following the best practices outlined in this article, you can ensure your Expo update server runs stably and efficiently.

## Related Resources

- [PM2 Official Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Bun Build Documentation](https://bun.sh/docs/bundler)
- [Nginx Load Balancing Guide](https://nginx.org/en/docs/http/load_balancing.html)
- [Linux System Service Management](https://www.digitalocean.com/community/tutorials/how-to-use-systemctl-to-manage-systemd-services-and-units)