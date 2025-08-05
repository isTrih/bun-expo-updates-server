# OSS Adapter System

Bun Expo Updates Server provides a flexible Object Storage Service (OSS) adapter system for managing update file storage and distribution. This page details how to configure and use these adapters.

## OSS Adapter Overview

The OSS adapter system allows the server to integrate with various cloud storage providers, including:

- **DogeCloud**: DogeCloud object storage
- **Qiniu Cloud**: Qiniu cloud storage
- **AWS S3**: Amazon S3 or S3-compatible storage services
- **Custom Adapters**: Implement your own storage provider adapters

This flexible architecture allows you to choose the storage service that best fits your needs and region.

## Quick Start

### 1. Create Configuration File

First, you need to set up your OSS provider configuration:

```typescript
// src/config/oss-config.ts
import { OSSConfig } from '../utils/oss-provider/types';

export const dogecloudConfig: OSSConfig = {
  provider: 'dogecloud',
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key'
};
```

### 2. Set Environment Variables

Alternatively, you can configure using environment variables:

```bash
# Basic OSS configuration
OSS_PROVIDER=dogecloud
OSS_ACCESS_KEY=your_access_key
OSS_SECRET_KEY=your_secret_key

# Additional config depending on provider
OSS_REGION=your_region
OSS_BUCKET=your_bucket_name
OSS_ENDPOINT=your_endpoint_url  # Required for S3 or custom providers
OSS_FORCE_PATH_STYLE=0  # Optional: force path style (1 for yes, 0 for no)
```

### 3. Initialize and Use OSS

```typescript
import { getOSSProvider } from '../utils/oss-provider/factory';

async function initApp() {
  try {
    // Initialize the OSS provider
    const ossProvider = await getOSSProvider();
    
    // Check if initialization was successful
    if (!ossProvider) {
      console.error('Failed to initialize OSS provider');
      return;
    }
    
    console.log(`Successfully initialized ${ossProvider.getBucketName()} OSS provider`);
    
    // Now you can use ossProvider for file operations
  } catch (error) {
    console.error('Error initializing OSS:', error);
  }
}
```

## Supported Provider Configurations

### DogeCloud Configuration

```typescript
// Configuration file approach
const dogecloudConfig = {
  provider: 'dogecloud',
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key'
};

// Environment variables approach
// OSS_PROVIDER=dogecloud
// OSS_ACCESS_KEY=your_access_key
// OSS_SECRET_KEY=your_secret_key
```

### Qiniu Cloud Configuration

```typescript
const qiniuConfig = {
  provider: 'qiniu',
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key',
  region: 'your_region',
  bucket: 'your_bucket'
};

// Environment variables approach
// OSS_PROVIDER=qiniu
// OSS_ACCESS_KEY=your_access_key
// OSS_SECRET_KEY=your_secret_key
// OSS_REGION=your_region
// OSS_BUCKET=your_bucket
```

### AWS S3 Configuration

```typescript
const s3Config = {
  provider: 's3',
  accessKey: 'your_access_key',
  secretKey: 'your_secret_key',
  region: 'your_region',
  bucket: 'your_bucket',
  endpoint: 'your_endpoint',
  forcePathStyle: false // Optional, defaults to false
};

// Environment variables approach
// OSS_PROVIDER=s3
// OSS_ACCESS_KEY=your_access_key
// OSS_SECRET_KEY=your_secret_key
// OSS_REGION=your_region
// OSS_BUCKET=your_bucket
// OSS_ENDPOINT=your_endpoint
// OSS_FORCE_PATH_STYLE=0
```

## OSS Operations Guide

### File Upload

```typescript
async function uploadFile(ossProvider, localFilePath, ossFilePath) {
  try {
    // Read local file
    const fileContent = await Bun.file(localFilePath).arrayBuffer();
    const content = new Uint8Array(fileContent);
    
    // Determine MIME type
    const mimeType = getMimeType(localFilePath);
    
    // Upload to OSS
    await ossProvider.putObject({
      key: ossFilePath,
      body: content,
      contentType: mimeType
    });
    
    console.log(`Successfully uploaded ${localFilePath} to ${ossFilePath}`);
  } catch (error) {
    console.error(`Failed to upload file: ${error.message}`);
  }
}
```

### File Download

```typescript
async function downloadFile(ossProvider, ossFilePath, localFilePath) {
  try {
    // Get file from OSS
    const result = await ossProvider.getObject({ key: ossFilePath });
    
    // Write file content to local file
    await Bun.write(localFilePath, result.body);
    
    console.log(`Successfully downloaded ${ossFilePath} to ${localFilePath}`);
  } catch (error) {
    console.error(`Failed to download file: ${error.message}`);
  }
}
```

### Listing Files

```typescript
async function listFiles(ossProvider, prefix) {
  try {
    // List objects with a specific prefix
    const result = await ossProvider.listObjects({ prefix });
    
    console.log(`Found ${result.Contents.length} objects with prefix "${prefix}"`);
    
    // Process the results
    for (const object of result.Contents) {
      console.log(`- ${object.Key} (Size: ${object.Size} bytes)`);
    }
  } catch (error) {
    console.error(`Failed to list files: ${error.message}`);
  }
}
```

### Deleting Files

```typescript
async function deleteFile(ossProvider, ossFilePath) {
  try {
    // Delete file
    await ossProvider.deleteObject({ key: ossFilePath });
    
    console.log(`Successfully deleted ${ossFilePath}`);
  } catch (error) {
    console.error(`Failed to delete file: ${error.message}`);
  }
}
```

## Creating Custom Adapters

If you need to integrate with a storage provider that is not directly supported, you can create a custom adapter:

### 1. Implement the Adapter Interface

```typescript
import { OSSAdapter, OSSConfig, PutObjectParams, GetObjectParams, HeadObjectParams } from '../utils/oss-provider/types';

class CustomOSSAdapter implements OSSAdapter {
  private config: OSSConfig;
  private client: any; // Your storage client instance

  constructor(config: OSSConfig) {
    this.config = config;
    
    // Initialize your storage client
    this.client = new YourStorageClient({
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      // Other config...
    });
  }

  getBucketName(): string {
    return this.config.bucket || 'default-bucket';
  }

  async listObjects(params: { prefix?: string }): Promise<any> {
    // Implement logic to list objects
    const result = await this.client.listObjects({
      bucket: this.getBucketName(),
      prefix: params.prefix || ''
    });
    
    return {
      Contents: result.objects.map(obj => ({
        Key: obj.key,
        Size: obj.size
      }))
    };
  }

  async getObject(params: GetObjectParams): Promise<any> {
    // Implement logic to get objects
    const result = await this.client.getObject({
      bucket: this.getBucketName(),
      key: params.key
    });
    
    return {
      body: result.content,
      contentType: result.contentType
    };
  }

  async putObject(params: PutObjectParams): Promise<void> {
    // Implement logic to upload objects
    await this.client.putObject({
      bucket: this.getBucketName(),
      key: params.key,
      content: params.body,
      contentType: params.contentType
    });
  }

  async deleteObject(params: { key: string }): Promise<void> {
    // Implement logic to delete objects
    await this.client.deleteObject({
      bucket: this.getBucketName(),
      key: params.key
    });
  }

  async headObject(params: HeadObjectParams): Promise<any> {
    // Implement logic to check objects
    const result = await this.client.headObject({
      bucket: this.getBucketName(),
      key: params.key
    });
    
    return {
      ContentType: result.contentType,
      ContentLength: result.contentLength
    };
  }

  async generatePresignedUrl(params: { key: string; expires?: number }): Promise<string> {
    // Implement logic to generate presigned URLs
    return this.client.generatePresignedUrl({
      bucket: this.getBucketName(),
      key: params.key,
      expires: params.expires || 3600
    });
  }
}
```

### 2. Register Your Custom Adapter

Modify the factory file to include your custom adapter:

```typescript
// src/utils/oss-provider/factory.ts
import { OSSAdapter, OSSConfig } from './types';
import { DogeCloudAdapter } from './dogecloud-adapter';
import { S3Adapter } from './s3-adapter';
import { CustomOSSAdapter } from './custom-adapter';

export function createOSSAdapter(config: OSSConfig): OSSAdapter {
  switch (config.provider) {
    case 'dogecloud':
      return new DogeCloudAdapter(config);
    case 's3':
      return new S3Adapter(config);
    case 'custom':
      return new CustomOSSAdapter(config);
    default:
      throw new Error(`Unsupported OSS provider: ${config.provider}`);
  }
}
```

## Best Practices

### Performance Optimization

1. **Batch Operations**: Use batch operations instead of individual requests for multiple small files
2. **Appropriate Timeouts**: Configure appropriate timeouts for different operations
3. **Region Selection**: Choose storage regions close to your users
4. **Caching Strategies**: Set appropriate cache headers for static assets

### Security Recommendations

1. **Principle of Least Privilege**: OSS access keys should have only necessary permissions
2. **Key Rotation**: Regularly rotate access keys
3. **HTTPS**: Ensure all OSS access uses HTTPS
4. **Environment Variables**: Use environment variables instead of hardcoded configurations
5. **Audit Logs**: Enable OSS access logs for monitoring

### Error Handling

Implement robust error handling when using OSS adapters:

```typescript
async function safeOSSOperation(operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    console.error(`OSS operation failed: ${error.message}`);
    
    // Implement different retry strategies based on error type
    if (error.code === 'NetworkError') {
      // Retry network errors
      return await retryWithBackoff(operation);
    }
    
    // Return fallback value if provided
    if (fallback !== undefined) {
      return fallback;
    }
    
    // Re-throw the error to be handled by caller
    throw error;
  }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Connection Timeouts**
   - Check network connectivity
   - Verify endpoint is correct
   - Check firewall rules

2. **Access Denied Errors**
   - Verify access key and secret
   - Check bucket policies and permissions
   - Confirm bucket name is correct

3. **File Not Found Errors**
   - Verify file path and prefix
   - Check case sensitivity (many OSS providers are case-sensitive)
   - Confirm file was successfully uploaded

4. **MIME Type Issues**
   - Use the `getMimeType` utility function to ensure correct content types
   - Explicitly set content type for special file types

### Debugging Tips

1. **Enable Verbose Logging**:
   ```bash
   DEBUG=true LOG_LANGUAGE=en_US bun run dev
   ```

2. **Check OSS Provider Status**:
   - Visit provider status pages
   - Check for service interruption announcements

3. **Test Connection**:
   ```typescript
   async function testOSSConnection(ossProvider) {
     try {
       // Try to list an object to test connection
       await ossProvider.listObjects({ prefix: '', maxKeys: 1 });
       console.log('OSS connection test successful!');
       return true;
     } catch (error) {
       console.error('OSS connection test failed:', error.message);
       return false;
     }
   }
   ```

## Further Reading

- [Complete OSS Adapter API Reference](/en/guide/api#oss-adapters)
- [Object Storage Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [DogeCloud Official Documentation](https://docs.dogecloud.com/oss)
- [Qiniu Cloud Developer Documentation](https://developer.qiniu.com/kodo)
- [AWS S3 Developer Guide](https://docs.aws.amazon.com/AmazonS3/latest/dev/Welcome.html)