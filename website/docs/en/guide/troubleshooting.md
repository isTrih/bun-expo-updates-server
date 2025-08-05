# Troubleshooting

This guide helps you identify and resolve common issues with Bun Expo Updates Server. If you encounter problems during setup, deployment, or operation, check these common solutions first.

## Common Issues

### Server Won't Start

**Symptoms:**
- Server fails to start
- Error messages about port conflicts
- Permission errors

**Solutions:**

1. **Port already in use**
   ```bash
   Error: listen EADDRINUSE: address already in use :::3001
   ```
   
   Solution: Check if another process is using the port:
   ```bash
   # Check what's using the port
   lsof -i :3001
   # OR
   netstat -tuln | grep 3001
   
   # Change the port in your .env file
   echo "port=3002" >> .env
   ```

2. **Missing dependencies**
   ```bash
   Error: Cannot find module '...'
   ```
   
   Solution: Reinstall dependencies:
   ```bash
   bun install
   ```

3. **Permission issues**
   ```bash
   Error: EACCES: permission denied
   ```
   
   Solution: Check file permissions:
   ```bash
   # For binary file
   chmod +x server
   
   # For directories
   chmod -R 755 updates/
   chmod -R 755 logs/
   ```

### Update Deployment Fails

**Symptoms:**
- Errors during the `bun up` command
- Updates not showing in client apps
- OSS upload errors

**Solutions:**

1. **Client project path not set**
   
   Solution: Set the client project path:
   ```bash
   export CLIENT_PROJECT_PATH=/path/to/your/client/project
   # Then try again
   bun up
   ```

2. **OSS configuration errors**
   ```bash
   Error: Failed to upload file to OSS
   ```
   
   Solution: Check your OSS credentials and connection:
   ```bash
   # Test OSS connection with a simple list operation
   bun run src/scripts/testOssConnection.ts
   
   # Verify environment variables are set correctly
   echo $OSS_ACCESS_KEY
   echo $OSS_SECRET_KEY
   echo $OSS_PROVIDER
   ```

3. **Expo export failures**
   
   Solution: Try manually exporting your Expo project:
   ```bash
   cd /path/to/client/project
   bun expo export
   ```
   
   Check for errors in the Expo export process.

### Client App Not Receiving Updates

**Symptoms:**
- App shows "No updates available"
- Updates don't download on app startup
- Manifest errors in console

**Solutions:**

1. **Runtime version mismatch**
   
   Ensure the runtime version in your app's configuration matches the one you're uploading updates for:
   
   ```json
   // In app.json or app.config.js
   {
     "expo": {
       "runtimeVersion": "1.0.0"
     }
   }
   ```
   
   Check the runtime version of your updates:
   ```bash
   ls -la updates/
   ```

2. **Update URL misconfiguration**
   
   Verify your app is configured with the correct update URL:
   
   ```json
   // In app.json or app.config.js
   {
     "expo": {
       "updates": {
         "url": "https://your-update-server.com/api/manifest",
         "enabled": true,
         "checkAutomatically": "ON_LOAD"
       }
     }
   }
   ```

3. **Code signing issues**
   
   If you're using code signing, ensure the public key in your app matches the private key on the server:
   
   ```bash
   # On server, get the public key in Base64 format
   cat code-sign-keys/public-key.pem | grep -v "PUBLIC KEY" | tr -d '\n'
   
   # Make sure this matches what's in your app.json
   ```

4. **Network connectivity issues**
   
   Check if the client can reach your update server:
   ```bash
   # On client device/emulator
   curl -v https://your-update-server.com/health
   ```

### Redis Connection Issues

**Symptoms:**
- Server errors mentioning Redis
- Connection refused errors
- Authentication failures

**Solutions:**

1. **Redis not running**
   ```bash
   Error: Redis connection failed
   ```
   
   Solution: Ensure Redis is running:
   ```bash
   # Check Redis status
   redis-cli ping
   
   # Start Redis if needed
   sudo systemctl start redis  # On Linux
   brew services start redis   # On macOS
   ```

2. **Redis URL misconfiguration**
   
   Check your Redis URL format:
   ```bash
   # Format: redis://[username]:[password]@host:port/db
   
   # Example for local Redis with no password
   REDIS_URL=redis://localhost:6379
   
   # Example with password
   REDIS_URL=redis://:your-password@localhost:6379
   ```

3. **Redis authentication failure**
   
   Check if Redis requires authentication and update your REDIS_URL accordingly.

### OSS Storage Issues

**Symptoms:**
- File upload errors
- Access denied errors
- Missing files in storage

**Solutions:**

1. **Invalid credentials**
   
   Verify your OSS credentials and check permissions:
   ```bash
   # Test credentials with a simple operation
   OSS_PROVIDER=your_provider OSS_ACCESS_KEY=your_key OSS_SECRET_KEY=your_secret bun run src/scripts/testOssCredentials.ts
   ```

2. **Bucket does not exist**
   
   Make sure the specified bucket exists and is accessible with your credentials.

3. **Region mismatch**
   
   Ensure you're using the correct region for your bucket:
   ```bash
   # For S3-compatible providers, set the region
   OSS_REGION=us-east-1
   ```

4. **Endpoint issues (for S3 or custom providers)**
   
   Verify the endpoint URL is correct:
   ```bash
   OSS_ENDPOINT=https://s3.amazonaws.com
   # or for custom endpoints
   OSS_ENDPOINT=https://your-custom-endpoint.com
   ```

### Manifest Generation Errors

**Symptoms:**
- Invalid manifest format errors
- Missing assets in manifest
- Signature verification failures

**Solutions:**

1. **Incomplete export**
   
   Check if the Expo export completed successfully and all assets were generated:
   ```bash
   # Check the exported files
   ls -la updates/your-runtime-version/your-timestamp/
   ```

2. **MIME type issues**
   
   If assets have incorrect MIME types, run the MIME type correction script:
   ```bash
   bun run src/scripts/updateMime.ts
   ```

3. **Signature problems**
   
   Regenerate your code signing keys if needed:
   ```bash
   # Create a new key pair
   mkdir -p code-sign-keys
   openssl genrsa -out code-sign-keys/private-key.pem 2048
   openssl rsa -in code-sign-keys/private-key.pem -pubout -out code-sign-keys/public-key.pem
   ```

## Debugging Techniques

### Enable Debug Mode

Set the `DEBUG` environment variable to enable detailed logging:

```bash
# In .env file or export before running
DEBUG=true LOG_LANGUAGE=en_US bun run dev
```

### Check Server Logs

Look for error messages in the server logs:

```bash
# View the most recent logs
tail -f logs/server.log

# Search for specific errors
grep "Error" logs/server.log
```

### Inspect Network Requests

Use browser developer tools or tools like `curl` to inspect API responses:

```bash
# Test manifest endpoint with appropriate headers
curl -H "expo-protocol-version: 1" \
     -H "expo-platform: ios" \
     -H "expo-runtime-version: 1.0.0" \
     http://localhost:3001/api/manifest
```

### Test OSS Operations Manually

Create a simple script to test OSS operations:

```typescript
// test-oss.ts
import { getOSSProvider } from './src/utils/oss-provider/factory';

async function testOSS() {
  try {
    const ossProvider = await getOSSProvider();
    
    // List objects
    const result = await ossProvider.listObjects({ prefix: '' });
    console.log('Objects:', result.Contents);
    
    // Test a simple upload
    const testData = new TextEncoder().encode('test file');
    await ossProvider.putObject({
      key: 'test-file.txt',
      body: testData,
      contentType: 'text/plain'
    });
    console.log('Upload successful');
    
    // Test download
    const downloaded = await ossProvider.getObject({ key: 'test-file.txt' });
    console.log('Download successful:', new TextDecoder().decode(downloaded.body));
  } catch (error) {
    console.error('OSS test failed:', error);
  }
}

testOSS();
```

Run with:
```bash
bun run test-oss.ts
```

## Advanced Troubleshooting

### Memory Issues

If the server is running out of memory:

```bash
# Monitor memory usage
ps -o pid,rss,command -p $(pgrep -f "server")

# For PM2-managed instances
pm2 monit
```

If memory usage is high, consider:
- Increasing the available memory
- Using a more efficient OSS adapter
- Implementing better cleanup in your code

### Performance Issues

For slow update delivery:

1. **Check network latency**
   ```bash
   # Test latency to your server
   ping your-server.com
   ```

2. **Consider using a CDN** for asset delivery

3. **Optimize asset sizes** in your Expo project

### Rollback Strategies

If a bad update was deployed:

```bash
# List available updates
ls -la updates/your-runtime-version/

# Point "latest" to a previous working update
cd updates/your-runtime-version/
rm -f latest
ln -sf previous-working-timestamp latest

# Optionally, create a specific rollback in the manifest
# This requires manual intervention in the manifest logic
```

## Getting Help

If you're still experiencing issues after trying these solutions:

1. Check the [GitHub issues](https://github.com/isTrih/bun-expo-updates-server/issues) for similar problems
2. Review the [Expo Updates documentation](https://docs.expo.dev/versions/latest/sdk/updates/) for client-side configuration
3. Explore the [Expo forums](https://forums.expo.dev/) for community support
4. Consider filing a new issue with detailed reproduction steps