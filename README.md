# Custom Expo Update Server

<p align="center">
  <img src="./website/docs/public/beu-icon.png" alt="Bun Expo Updates Server" width="200"/>
</p>

<p align="center">English Documentation | <a href="./README.zh-CN.md">中文文档</a></p>

<p align="center">
  <a href="https://bun-expo-updates.chaozj.com/en/"><img src="https://img.shields.io/badge/Documentation-Website-blue?style=for-the-badge" alt="Documentation"/></a>
</p>


<p align="center">
  <img src="https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white" alt="Bun"/>
  <img src="https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37" alt="Expo"/>
</p>

<p align="center">
    <a href="https://afdian.tv/a/istrih"><img width="100" src="https://pic1.afdiancdn.com/static/img/welcome/button-sponsorme.png" alt="Sponsor Me"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"/>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/>
  <img src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" alt="Maintained"/>
</p>

This repository contains a `BUN` server that implements the `Expo Updates` protocol specification.

> [!IMPORTANT]
> This repository provides a basic demonstration of how the protocol can be converted into code. There is no guarantee that it is complete, stable, or performant enough to be used as a complete backend for `expo-updates`.
> I do not provide technical support for such custom `expo-updates` server implementations.

## Why a Custom Update Server
`Expo` provides a set of services called `EAS (Expo Application Services)`, which includes `EAS Update`, allowing you to host and serve updates for `Expo` applications using the `expo-updates` library.

In some cases, such as ~~being unable to afford EAS services~~ or having your main users in China, you might need more precise control over how updates are delivered to your application. One option is to implement a custom update server that complies with the specification to provide update manifests and assets.

## Tech Stack
- Runtime Environment: Bun
- Web Framework: Elysia
- Development Language: TypeScript
- OSS: Dogecloud Object Storage (S3 protocol)

## Project Structure
```bash
bun-expo-updates-server/
├── .gitignore
├── README.md
├── README.zh-CN.md
├── bun.lock
├── package.json
├── .env.example                             # Environment variable example file
├── updates/                                 # Update file storage directory
├── logs/                                    # Log files
├── src/
│   ├── index.ts                             # Application entry file
│   ├── modules/                             # Core modules
│   │   └── manifest.ts                      # Manifest processing module
│   ├── config/                              # Configuration files
│   │   └── oss-config.example.ts
│   ├── code-sign-keys/                      # Code signing keys
│   ├── test/                                # Test files
│   │   └── utils/                           # Utility tests
│   ├── scripts/                             # Script files
│   │   ├── upload.sh                        # Version update script
│   │   ├── exportClientExpoConfig.ts        # Export Expo client config script
│   │   ├── updateMime.ts                    # Fix MIME type script
│   │   └── uploadUpdatesToOSS.ts            # Upload updates to OSS script
│   └── utils/                               # Utilities
│       ├── helper-oss.ts                    # OSS helper functions
│       ├── logger.ts                        # Logging tool
│       ├── util.ts                          # General utility functions
│       └── oss-provider/                    # OSS providers
│           ├── dogecloud-adapter.ts         # Dogecloud adapter
│           ├── s3-adapter.ts                # S3 adapter
│           ├── factory.ts                   # Factory pattern adapter
│           └── types.ts                     # OSS provider type definitions
└── tsconfig.json
```

## Getting Started
### Update-Related Terminology
- Runtime version: String type. Specifies the underlying native code version on which the app runs. When updates depend on new or changed native code (such as updating the Expo SDK or adding native modules), the runtime version needs to be updated.
- Platform: "ios" or "android". Specifies the platform for which updates are provided.
- Manifest: Object described in the protocol. Contains assets and other details needed for Expo applications to load updates.

### How to Use the Server
#### Development Environment Server
1. Install dependencies and start the server
   Run the following commands in the project root directory:

   ```bash
   bun install
   bun run dev
   ```
   The server will start at http://localhost:3000.

2. Configure Environment Variables
   Create a `.env` file and configure the following variables:

   ```bash
    # Redis Configuration
    # Format: redis://password@localhost:6379
    REDIS_URL=redis://localhost:6379

    # Log Settings
    # Enable debug logs
    DEBUG=true
    # Log language setting (zh_CN/en_US)
    LOG_LANGUAGE=en_US

    # Object Storage Service Configuration
    # OSS provider
    OSS_PROVIDER=your_oss_provider
    # OSS access key
    OSS_ACCESS_KEY=your_access_key
    # OSS secret key
    OSS_SECRET_KEY=your_secret_key
    # Force path style (0 false, 1 true)
    OSS_FORCE_PATH_STYLE=0
    # OSS region
    # OSS_REGION=your_region
    # OSS bucket name
    # OSS_BUCKET=your_bucket
    # OSS endpoint
    # OSS_ENDPOINT=your_endpoint

    # Client Project Path
    # Local path to the client project
    CLIENT_PROJECT_PATH=/path/to/your/client/project

    # Private Key Path Configuration
    # Path to the private key for code signing
    PRIVATE_KEY_PATH=code-sign-keys/private-key.pem

    # Server Port Configuration
    # Port on which the server listens
    port=3001

    # Update Resource Download URL (OSS or CDN)
    # Base URL for update resources
    HOSTNAME=https://your-update-domain.com
   ```

#### Production Environment Server
1. Build the Project
   Run the following commands in the project root directory:
    ```bash
    bun install
    # Build the project

    # Choose the appropriate target for your server architecture
    # Example: bun-linux-x64
    bun build \
            --compile \
            --minify \
            --target bun-linux-x64 \
            --outfile server \
            ./src/index.ts
    ```
    | --target              | OS      | Architecture | `haswell` architecture | `nehalem` architecture |
    | --------------------- | ------- | ----------- | :-------------------: | :--------------------: |
    | bun-linux-x64         | Linux   | x64        |          ✅           |          ✅            |
    | bun-linux-arm64       | Linux   | arm64      |          ✅           |          N/A           |
    | bun-windows-x64       | Windows | x64        |          ✅           |          ✅            |
    | ~~bun-windows-arm64~~ | Windows | arm64      |          ❌           |          ❌            |
    | bun-darwin-x64        | macOS   | x64        |          ✅           |          ✅            |
    | bun-darwin-arm64      | macOS   | arm64      |          ✅           |          N/A           |

2. Start the Server
   - Run the following commands in the same directory as the `server` file:
    ```bash
        # Grant execute permission
        chmod +x server
        mkdir -p logs
        # Start the server
        ./server
    ```
   - The server will start at http://localhost:3001.

   - Using pm2 to manage the binary file
     - Run the following commands in the same directory as the `server` file:
    ```bash
        # Grant execute permission
        chmod +x server
        mkdir -p logs
    ```
    - Create an `ecosystem.config.js` file:
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
    }
    ```
    Run the following commands in the same directory as `ecosystem.config.js`:
    ```bash
    pm2 start
    pm2 logs bun-updates
    ```

3. Configure Expo Application
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

4. Export and Upload Updates
   Use the scripts provided in the project to export application updates and upload them to object storage:

   ```bash
   # Export Expo client
   ./src/scripts/export-client.sh

   # Upload updates to object storage
   bun run src/scripts/uploadUpdatesToOSS.ts
   ```

   Alternatively, you can use the command in `package.json`:
   ```bash
   bun up
   ```
   to generate and upload the hot update package.

5. Access Updates
   Client applications will automatically check for and download updates through the `/api/manifest` endpoint.

## Server API
The server currently provides the following API endpoints:

- `GET /api/manifest`: Provides Expo update manifests
  - Supported parameters:
    - `expo-protocol-version`: Header parameter, supports versions 0 and 1
    - `expo-platform`: Header parameter, value is "ios" or "android"
    - `expo-runtime-version`: Header parameter, specifies the runtime version
    - `expo-current-update-id`: Header parameter, ID of the client's current update
    - `expo-embedded-update-id`: Header parameter, ID of the embedded update in the application
    - `expo-expect-signature`: Header parameter, if set, the response will be signed
  - Responses:
    - Normal update: Returns a multipart/mixed response containing the latest update manifest and resource information
    - Rollback update: Returns a multipart/mixed response with rollback instructions
    - No update: Returns a response indicating that no update is available

## About This Server
This server is created using Bun and the Elysia framework, supporting Object Storage (OSS) functionality to manage update files. The main entry file is located at src/index.ts, and the core update handling logic is in src/modules/manifest.ts.

The server supports the following features:
- Multi-platform update support (iOS and Android)
- Update management based on runtime version
- Rollback mechanism
- Code signature verification
- Object Storage (OSS) integration
- Logging

## License
This project is licensed under the MIT License.
