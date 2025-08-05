# Server Configuration

This page provides detailed information on how to configure Bun Expo Updates Server, including environment variables, Redis configuration, object storage settings, and more.

## Environment Variable Configuration

Bun Expo Updates Server uses environment variables for configuration. You can set these variables using a `.env` file or directly in your environment. Here are all available environment variables:

### Basic Configuration

| Environment Variable | Required | Description | Default Value |
|---------|------|------|-------|
| `port` | No | Port on which the server listens | `3000` |
| `DEBUG` | No | Enable debug logs | `false` |
| `LOG_LANGUAGE` | No | Log language, supports `zh-CN` or `en-US` | `en-US` |
| `HOSTNAME` | Yes | Base URL for update resources | - |

### Redis Configuration

| Environment Variable | Required | Description | Default Value |
|---------|------|------|-------|
| `REDIS_URL` | Yes | Redis connection URL, format: `redis://[username]:[password]@host:port` | - |

### Client Project Configuration

| Environment Variable | Required | Description | Default Value |
|---------|------|------|-------|
| `CLIENT_PROJECT_PATH` | Yes | Local path to the client Expo project | - |

### Code Signing Configuration

| Environment Variable | Required | Description | Default Value |
|---------|------|------|-------|
| `PRIVATE_KEY_PATH` | No | Path to the private key for code signing | `code-sign-keys/private-key.pem` |

### Object Storage Service (OSS) Configuration

| Environment Variable | Required | Description | Default Value |
|---------|------|------|-------|
| `OSS_PROVIDER` | Yes | OSS provider, supports `dogecloud`, `qiniu`, `s3`, or `custom` | - |
| `OSS_ACCESS_KEY` | Yes | OSS access key | - |
| `OSS_SECRET_KEY` | Yes | OSS secret key | - |
| `OSS_FORCE_PATH_STYLE` | No | Force path style (0 false, 1 true) | `0` |
| `OSS_REGION` | Yes* | OSS region, required by some providers | - |
| `OSS_BUCKET` | Yes* | OSS bucket name, required by some providers | - |
| `OSS_ENDPOINT` | Yes* | OSS endpoint, required for S3 or custom providers | - |

*Note: Some variables may be required depending on the selected OSS provider.

## .env File Example

Here's an example of a complete `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Log Settings
DEBUG=true
LOG_LANGUAGE=en-US

# OSS (Object Storage Service) Configuration
OSS_PROVIDER=dogecloud
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key
OSS_FORCE_PATH_STYLE=0
# OSS_REGION=your_region
# OSS_BUCKET=your_bucket
# OSS_ENDPOINT=your_endpoint

# Client Project Path
CLIENT_PROJECT_PATH=/path/to/your/client/project

# Private Key Path Configuration
PRIVATE_KEY_PATH=code-sign-keys/private-key.pem

# Server Port Configuration
port=3001

# Update Resource Download URL
HOSTNAME=https://your-update-domain.com
```

## Redis Configuration

Redis is used for caching update manifests and other server states. Ensure you have a Redis instance available and configured via the `REDIS_URL` environment variable.

### Redis Connection Format

```
redis://[[username]:[password]@][host][:port][/db-number]
```

Examples:
- `redis://localhost:6379` - Connect to local Redis with no password
- `redis://:password123@redis-server:6379` - Connect to Redis server with password
- `redis://username:password@redis-server:6379/1` - Using username, password, and specific database

## Code Signing

The Expo Updates protocol supports code signing to verify update integrity. To enable code signing, you need to generate a key pair and configure the private key path:

### Generate Key Pair

```bash
# Create directory
mkdir -p code-sign-keys

# Generate private key
openssl genrsa -out code-sign-keys/private-key.pem 2048

# Generate public key from private key
openssl rsa -in code-sign-keys/private-key.pem -pubout -out code-sign-keys/public-key.pem
```

Set the `PRIVATE_KEY_PATH` environment variable to the path of your private key:

```bash
PRIVATE_KEY_PATH=code-sign-keys/private-key.pem
```

In your Expo client configuration, add the public key configuration:

```json
{
  "expo": {
    "updates": {
      "url": "https://your-server-url.com/api/manifest",
      "codeSigningPublicKeyBase64": "Your public key (Base64 encoded)",
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    }
  }
}
```

To get the Base64 encoded public key, you can run:

```bash
cat code-sign-keys/public-key.pem | grep -v "PUBLIC KEY" | tr -d '\n'
```

## Object Storage (OSS) Configuration

The server supports multiple object storage services for storing update files. Configure the required environment variables based on your chosen provider:

### DogeCloud Configuration

```bash
OSS_PROVIDER=dogecloud
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key
```

### Qiniu Cloud Configuration

```bash
OSS_PROVIDER=qiniu
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key
OSS_REGION=your_region
OSS_BUCKET=your_bucket
```

### AWS S3 Configuration

```bash
OSS_PROVIDER=s3
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key
OSS_REGION=your_region
OSS_BUCKET=your_bucket
OSS_ENDPOINT=your_endpoint
OSS_FORCE_PATH_STYLE=0
```

### Custom OSS Provider

To use a custom OSS provider, see the [OSS Adapters](/en/guide/oss-adapters) section for information on how to implement and register a custom adapter.

## Production Environment Configuration

In a production environment, it is recommended to:

1. Disable debug logs:
   ```bash
   DEBUG=false
   ```

2. Use secure Redis configuration, including password and TLS:
   ```bash
   REDIS_URL=redis://:your-password@your-redis-host:6379
   ```

3. Ensure HOSTNAME uses HTTPS:
   ```bash
   HOSTNAME=https://your-production-domain.com
   ```

4. Consider using environment variable management tools like Docker Secrets or cloud platform environment variable management features instead of directly using .env files.

## Advanced Configuration

### Multiple Client Project Configuration

If you need to manage updates for multiple client projects, you can switch the `CLIENT_PROJECT_PATH` as needed:

```bash
# Upload updates for project 1
CLIENT_PROJECT_PATH=/path/to/project1 bun src/scripts/upload.ts

# Upload updates for project 2
CLIENT_PROJECT_PATH=/path/to/project2 bun src/scripts/upload.ts
```

### Performance Tuning

For high-traffic scenarios, consider:

1. Increasing Redis connection pool size
2. Using a CDN to distribute update files
3. Configuring appropriate resource limits for the server

For more advanced configuration options, refer to the relevant module documentation in the server source code.