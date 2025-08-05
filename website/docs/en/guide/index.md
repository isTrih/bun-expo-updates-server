# Introduction

## Project Introduction

Bun Expo Updates Server is an implementation of the Expo Updates protocol using the Bun runtime. This server allows you to provide custom updates for Expo applications without relying on Expo's official EAS Update service.

![Bun Expo Updates Server](/beu-icon.png)

## Why Choose a Custom Update Server?

Expo provides a set of services called EAS (Expo Application Services), which includes EAS Update, allowing you to host and serve updates for Expo applications using the expo-updates library. However, in certain situations, you may need to:

- Have more precise control over how updates are delivered to your application
- Deploy updates to servers in specific regions for improved access speeds
- Use your own cloud storage solutions
- Reduce costs or meet specific compliance requirements

## Tech Stack

- **Runtime Environment**: [Bun](https://bun.sh/)
- **Web Framework**: [Elysia](https://elysiajs.com/)
- **Development Language**: TypeScript
- **Cloud Storage**: Supports various object storage services (DogeCloud, Qiniu Cloud, AWS S3, etc.)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/isTrih/bun-expo-updates-server.git
cd bun-expo-updates-server
```

### 2. Install Dependencies

Make sure you have [Bun](https://bun.sh/) installed, then run:

```bash
bun install
```

### 3. Configure Environment Variables

Create a `.env` file and configure the necessary environment variables:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Log Settings
DEBUG=true
LOG_LANGUAGE=en_US

# OSS (Object Storage Service) Configuration
OSS_PROVIDER=your_oss_provider
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

### 4. Start the Development Server

```bash
bun run dev
```

The server will start at http://localhost:3001 (or the port you configured in .env).

## Configure Expo Client Application

Ensure your Expo application is configured to load updates from your custom server. Set in your app's app.json file:

```json
{
  "expo": {
    "updates": {
      "url": "http://your-server-url.com/api/manifest",
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    }
  }
}
```

## Using the Update System

### Creating and Deploying Updates

Use the scripts provided in the project to export application updates and upload them to object storage:

```bash
# Use the preset command to upload updates
bun up
```

This command will perform the following operations:
1. Export updates from the client project
2. Generate update timestamps and directory structure
3. Upload update files to the configured object storage

## Next Steps

- [Server Configuration](/en/guide/configuration) - Learn how to configure the server in detail
- [Update Management](/en/guide/updates) - Learn how to manage and deploy application updates
- [OSS Adapters](/en/guide/oss-adapters) - Learn about the object storage adapter system
