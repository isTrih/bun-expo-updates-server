# Expo Updates Server Scripts Documentation

## 1. Scripts Overview

This directory contains scripts for managing Expo updates deployment and uploading assets to cloud storage (OSS).

### upload.ts

A TypeScript script for exporting an Expo client project and deploying the updates to OSS. This script:
- Extracts the runtime version from the client project
- Generates a timestamp for the update
- Exports the Expo project
- Copies the exported files to the updates directory with proper versioning
- Creates or updates the "latest" symlink
- Uploads the update files to OSS

### uploadUpdatesToOSS.ts

Uploads update files to a configured cloud storage provider (OSS). Supports:
- Multiple OSS providers: DogeCloud, Qiniu, S3, or custom providers
- Automatically setting correct MIME types for files
- Directory structure preservation
- Detailed logging in both Chinese and English

### exportClientExpoConfig.ts

Exports the Expo configuration from a client project. Used by the upload script to extract information like the runtime version.

## 2. Required Environment Variables

Before using these scripts, you need to configure the following environment variables in your `.env` file:

### Client Project Path
```
CLIENT_PROJECT_PATH=/path/to/your/expo/client/project
```

### OSS Configuration
```
# OSS Provider (dogecloud, qiniu, s3, or custom)
OSS_PROVIDER=dogecloud

# OSS Access Credentials
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key

# OSS Configuration
OSS_REGION=automatic
OSS_BUCKET=your_bucket_name
OSS_ENDPOINT=your_endpoint_url  # Required for S3 or custom providers

# Optional: Force path style (1 for true, 0 for false)
OSS_FORCE_PATH_STYLE=0
```

### Optional Settings
```
# Language setting (zh-CN or en-US)
LOG_LANGUAGE=en-US
```

## 3. Usage Examples

### Complete Example: Uploading Updates to OSS

#### Option 1: Using the TypeScript upload script

```bash
# Configure environment variables in .env file or provide them inline
bun src/scripts/upload.ts
```

#### Option 2: Step by step manual process

```bash
# 1. Export client Expo config to get the runtime version
CLIENT_PROJECT_PATH=/path/to/client bun src/scripts/exportClientExpoConfig.ts > config.json
RUNTIME_VERSION=$(grep -o '"runtimeVersion":[^,}]*' config.json | cut -d':' -f2 | tr -d '" ')

# 2. Generate a timestamp
TIMESTAMP=$(date +%s)

# 3. Create directory structure
mkdir -p updates/$RUNTIME_VERSION/$TIMESTAMP

# 4. Export the Expo project
cd /path/to/client
bun expo export
cd -

# 5. Copy exported files to updates directory
cp -r /path/to/client/dist/* updates/$RUNTIME_VERSION/$TIMESTAMP/

# 6. Export Expo config to the updates directory
CLIENT_PROJECT_PATH=/path/to/client bun src/scripts/exportClientExpoConfig.ts > updates/$RUNTIME_VERSION/$TIMESTAMP/expoConfig.json

# 7. Create or update the latest symlink
cd updates/$RUNTIME_VERSION/
rm -f latest
ln -sf $TIMESTAMP latest
cd -

# 8. Upload updates to OSS
RUNTIME_VERSION=$RUNTIME_VERSION TIMESTAMP=$TIMESTAMP bun src/scripts/uploadUpdatesToOSS.ts
```

## 4. Important Notes

1. **OSS Provider Configuration**:
   - Make sure your OSS credentials are correct and have appropriate permissions
   - Test the OSS configuration before deploying production updates
   - Different providers may have specific requirements (see their documentation)

2. **Symlinks**:
   - The "latest" symlink is created for easy reference to the most recent update
   - Ensure your server environment supports symbolic links

3. **Error Handling**:
   - If upload fails, you can manually retry using the command shown in the error message
   - Check logs for detailed error information

4. **Permissions**:
   - Scripts need execute permissions: `chmod +x src/scripts/*.ts`
   - Ensure the process has write permissions to the updates directory

5. **Runtime Version**:
   - The client app must have a valid `runtimeVersion` in its Expo configuration
   - The runtime version determines the update compatibility

6. **File Types**:
   - All files are uploaded with appropriate MIME types for web serving
   - Special handling exists for common web assets (JS, JSON, images, fonts)

## 5. Advanced Configuration

### Custom OSS Provider

To use a custom OSS provider, implement the provider interface in the `src/utils/oss-provider` directory and add it to the factory.

### Multiple Client Projects

You can manage updates for multiple client projects by setting the `CLIENT_PROJECT_PATH` for each deployment:

```bash
CLIENT_PROJECT_PATH=/path/to/project1 bun src/scripts/upload.ts
CLIENT_PROJECT_PATH=/path/to/project2 bun src/scripts/upload.ts
```

### CI/CD Integration

These scripts can be integrated into CI/CD pipelines. Example GitHub Actions workflow:

```yaml
name: Deploy Expo Update

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: bun install
      - name: Deploy update
        run: bun src/scripts/upload.ts
        env:
          CLIENT_PROJECT_PATH: ./client
          OSS_PROVIDER: ${{ secrets.OSS_PROVIDER }}
          OSS_ACCESS_KEY: ${{ secrets.OSS_ACCESS_KEY }}
          OSS_SECRET_KEY: ${{ secrets.OSS_SECRET_KEY }}
          OSS_BUCKET: ${{ secrets.OSS_BUCKET }}
```

## 6. Troubleshooting

### Common Issues

1. **"Client project path does not exist"**
   - Check that CLIENT_PROJECT_PATH points to a valid Expo project
   - Ensure the path is absolute or properly resolved from the script location

2. **"Failed to get client Expo configuration"**
   - Verify the client project is a valid Expo project with app.json/app.config.js
   - Ensure @expo/config is installed in the server project

3. **"Cannot create latest symbolic link"**
   - Check file system permissions
   - Some environments (like Windows) may have limitations with symlinks

4. **"Failed to upload files to OSS"**
   - Verify OSS credentials and permissions
   - Check network connectivity to OSS provider
   - Ensure the bucket exists and is accessible

For more help, check the logs or reach out to the development team.