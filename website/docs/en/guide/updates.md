# Update Management

This page explains how to manage and deploy application updates in Bun Expo Updates Server.

## Update-Related Terminology

Before getting started, it's important to understand some key terms:

- **Runtime Version**: String type, specifies the underlying native code version on which the app runs. When updates depend on new or changed native code (such as updating the Expo SDK or adding native modules), the runtime version needs to be updated.
- **Platform**: "ios" or "android", specifies the platform for which updates are provided.
- **Manifest**: Object described in the protocol, contains assets and other details needed for Expo applications to load updates.
- **Timestamp**: Unique time value used to identify and organize updates.

## Update Directory Structure

Bun Expo Updates Server manages updates using the following directory structure:

```
updates/
├── [runtimeVersion1]/
│   ├── [timestamp1]/
│   │   ├── bundles/
│   │   │   ├── android-xxx.js
│   │   │   └── ios-xxx.js
│   │   ├── assets/
│   │   └── expoConfig.json
│   ├── [timestamp2]/
│   │   └── ...
│   └── latest -> [symbolic link to most recent timestamp directory]
└── [runtimeVersion2]/
    └── ...
```

This structure allows:
- Separation of updates by runtime version
- Maintenance of historical versions of each update
- Quick reference to the latest update via the "latest" symbolic link

## Creating and Deploying Updates

### Using the Built-in Script

Bun Expo Updates Server provides a convenient script to export, organize, and upload updates. This is the recommended method:

```bash
# Use the preset command to upload updates
bun up
```

This simple command performs the complete update process, including:
1. Extracting the runtime version from the client project
2. Generating a timestamp for the update
3. Exporting the Expo project
4. Copying exported files to the updates directory with proper versioning
5. Creating or updating the "latest" symbolic link
6. Uploading update files to OSS (Object Storage Service)

### Manual Steps

If you need more control or want to customize the process, you can manually perform these steps:

```bash
# 1. Export client Expo config to get runtime version
CLIENT_PROJECT_PATH=/path/to/client bun src/scripts/exportClientExpoConfig.ts > config.json
RUNTIME_VERSION=$(grep -o '"runtimeVersion":[^,}]*' config.json | cut -d':' -f2 | tr -d '" ')

# 2. Generate timestamp
TIMESTAMP=$(date +%s)

# 3. Create directory structure
mkdir -p updates/$RUNTIME_VERSION/$TIMESTAMP

# 4. Export Expo project
cd /path/to/client
bun expo export
cd -

# 5. Copy exported files to updates directory
cp -r /path/to/client/dist/* updates/$RUNTIME_VERSION/$TIMESTAMP/

# 6. Export Expo config to updates directory
CLIENT_PROJECT_PATH=/path/to/client bun src/scripts/exportClientExpoConfig.ts > updates/$RUNTIME_VERSION/$TIMESTAMP/expoConfig.json

# 7. Create or update latest symbolic link
cd updates/$RUNTIME_VERSION/
rm -f latest
ln -sf $TIMESTAMP latest
cd -

# 8. Upload updates to OSS
RUNTIME_VERSION=$RUNTIME_VERSION TIMESTAMP=$TIMESTAMP bun src/scripts/uploadUpdatesToOSS.ts
```

## Runtime Version Management

Runtime version is the identifier for the app's native code and is crucial for ensuring compatibility.

### Updating Runtime Version

When you make changes to your app that require updated native code (e.g., updating the Expo SDK version or adding native modules), you should update the runtime version:

1. Update the `runtimeVersion` in your client project's `app.json` or `app.config.js`:

```json
{
  "expo": {
    "runtimeVersion": "2.0.0"
  }
}
```

2. Rebuild and distribute a new binary version of your app
3. Create updates for the new runtime version

### Runtime Version Strategy

To ensure compatibility, consider the following strategy:

- Keep the same runtime version for minor JavaScript changes and asset updates
- Increment the runtime version and release a new app binary for updates requiring native code changes
- Consider using semantic versioning (e.g., "1.0.0") for runtime versions

## Rolling Back Updates

If you've deployed a problematic update, you can:

1. Roll back to a specific version:

```bash
# Find the update timestamp you want to roll back to
ls -la updates/[runtimeVersion]/

# Update the "latest" symbolic link to point to the older update
cd updates/[runtimeVersion]/
rm -f latest
ln -sf [oldTimestamp] latest
cd -
```

2. Optionally, create platform-specific rollbacks:

```bash
# Create rollback instructions for specific platforms
# This requires manual modification of manifest files
```

## Multi-Platform Updates

Bun Expo Updates Server supports providing different updates for iOS and Android platforms. Expo's export process automatically creates different bundles for each platform.

### Platform-Specific Updates

In some cases, you might want to deploy updates for specific platforms only:

1. Specify the platform during export:

```bash
# Export for iOS only
cd /path/to/client
bun expo export --platform ios
```

2. Upload the updates to the appropriate directory

## CI/CD Integration

The scripts of Bun Expo Updates Server can be easily integrated into CI/CD pipelines.

### GitHub Actions Example

Here's an example GitHub Actions workflow for automated update deployment:

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

## Update Verification and Monitoring

### Verifying Updates

Before deploying to users, you should validate updates:

1. Test updates in a development environment
2. Check manifest contents and asset integrity
3. Verify that code signing works properly (if enabled)

### Monitoring the Update Service

To ensure your update service is running properly:

1. Implement health check endpoints
2. Monitor server logs for errors
3. Set up monitoring for your OSS storage space

## Best Practices

1. **Frequent Backups**: Regularly back up update files and manifests
2. **Version Control**: Use semantic versioning to manage runtime versions
3. **Progressive Deployment**: Consider releasing updates to user groups in phases
4. **Rollback Plan**: Always have a clear rollback plan
5. **Resource Optimization**: Optimize asset sizes to reduce download times