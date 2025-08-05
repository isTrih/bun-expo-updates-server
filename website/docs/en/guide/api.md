# API Reference

This page provides detailed documentation for the API endpoints and usage methods of the Bun Expo Updates Server.

## Server API Overview

Bun Expo Updates Server provides a set of API endpoints that conform to the Expo Updates protocol, allowing Expo client applications to check for, download, and apply updates.

## Main API Endpoints

### Get Update Manifest

```
GET /api/manifest
```

This endpoint handles update requests from Expo clients and returns the appropriate update manifest or instructions.

#### Request Headers

| Header Parameter | Description | Example Values |
|---------|------|--------|
| `expo-protocol-version` | Expo Updates protocol version | `0` or `1` |
| `expo-platform` | Platform requesting updates | `ios` or `android` |
| `expo-runtime-version` | Runtime version of the client app | `1.0.0` |
| `expo-current-update-id` | ID of the currently installed update | `abc123` |
| `expo-embedded-update-id` | ID of the update embedded in the app | `xyz789` |
| `expo-expect-signature` | Whether response signature is expected | `true` |

#### Responses

Depending on the request situation and server configuration, this endpoint may return one of the following response types:

**1. Update Available**

Response type: `multipart/mixed`

```
--expo-multipart-boundary
Content-Type: application/json

{
  "manifestFilename": "manifest.json",
  "type": "practical-dilithium-duckling"
}
--expo-multipart-boundary
Content-Type: application/json
Content-Disposition: attachment; filename=manifest.json

{
  "id": "unique-update-id",
  "createdAt": "2023-10-30T12:00:00.000Z",
  "runtimeVersion": "1.0.0",
  "assets": [
    {
      "hash": "asset-hash-1",
      "key": "assets/image.png",
      "fileExtension": ".png",
      "contentType": "image/png",
      "url": "https://your-domain.com/updates/1.0.0/latest/assets/image.png"
    }
  ],
  "launchAsset": {
    "hash": "bundle-hash",
    "key": "bundles/ios-abcdef.js",
    "contentType": "application/javascript",
    "url": "https://your-domain.com/updates/1.0.0/latest/bundles/ios-abcdef.js"
  },
  "metadata": {},
  "extra": {
    "expoClient": {
      // Additional client configuration
    }
  }
}
--expo-multipart-boundary--
```

**2. No Update Available**

Response type: `application/json`

```json
{
  "manifestString": "{\"manifestFilename\":\"noupdate\",\"type\":\"no-update\"}",
  "manifestType": "no-update",
  "timestamp": 1635595200000
}
```

**3. Rollback Update**

Response type: `multipart/mixed`

```
--expo-multipart-boundary
Content-Type: application/json

{
  "manifestFilename": "manifest.json",
  "type": "rollback"
}
--expo-multipart-boundary
Content-Type: application/json
Content-Disposition: attachment; filename=manifest.json

{
  "id": "previous-update-id",
  "createdAt": "2023-10-29T12:00:00.000Z",
  "runtimeVersion": "1.0.0",
  "assets": [...],
  "launchAsset": {...},
  "metadata": {},
  "extra": {
    "expoClient": {}
  }
}
--expo-multipart-boundary--
```


## Error Handling

API endpoints use standard HTTP status codes to indicate the result of requests:

| Status Code | Description |
|-------|------|
| 200 | Success |
| 400 | Request parameter error or missing |
| 404 | Requested resource not found |
| 500 | Server internal error |

Error responses take the following format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed description of the error"
  }
}
```

## Code Signing

If code signing is enabled, the server will sign update manifests using the configured private key.

The signature is added to the response in the `expo-signature` header, formatted as:

```
expo-signature: keyid="KEYID",signature="BASE64_SIGNATURE"
```

Client applications must be configured with the corresponding public key to verify signatures:

```json
{
  "expo": {
    "updates": {
      "codeSigningPublicKeyBase64": "BASE64_ENCODED_PUBLIC_KEY"
    }
  }
}
```

## OSS Adapter API

OSS adapters provide the following core methods:

### getBucketName

Gets the OSS bucket name.

```typescript
getBucketName(): string
```

### listObjects

Lists objects with a specific prefix.

```typescript
listObjects(params: { prefix?: string }): Promise<{
  Contents: { Key: string; Size: number }[]
}>
```

### getObject

Gets the content of a specific object.

```typescript
getObject(params: {
  key: string
}): Promise<{
  body: Uint8Array;
  contentType?: string
}>
```

### putObject

Uploads an object to OSS.

```typescript
putObject(params: {
  key: string;
  body: Uint8Array;
  contentType?: string
}): Promise<void>
```

### deleteObject

Deletes an object from OSS.

```typescript
deleteObject(params: { key: string }): Promise<void>
```

### headObject

Gets an object's metadata without downloading the content.

```typescript
headObject(params: {
  key: string
}): Promise<{
  ContentType?: string;
  ContentLength?: number;
  LastModified?: Date
}>
```

### generatePresignedUrl

Generates a presigned URL for direct access to an object.

```typescript
generatePresignedUrl(params: {
  key: string;
  expires?: number
}): Promise<string>
```

## Examples of Using the API

### Checking for Updates in a Client Application

```javascript
import * as Updates from 'expo-updates';

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
}
```

### Testing the API with curl

```bash
# Test getting a manifest
curl -H "expo-protocol-version: 1" \
     -H "expo-platform: ios" \
     -H "expo-runtime-version: 1.0.0" \
     http://localhost:3000/api/manifest

```

## API Versioning

Bun Expo Updates Server supports different versions of the Expo Updates protocol through the `expo-protocol-version` request header. Currently supported versions:

- Version 0: Original Expo Updates protocol
- Version 1: Updated protocol with enhanced features, including additional metadata support

## Security Considerations

- API endpoints do not implement authentication; it's recommended to use an API gateway or proxy for protection in production
- Ensure OSS credentials have appropriate restrictions, allowing only necessary operations
- Consider using HTTPS endpoints, especially in production environments

## Testing and Debugging

To test API endpoints, you can use the following methods:

1. Use curl or Postman to send test requests
2. Enable verbose logging to see request handling details: `DEBUG=true LOG_LANGUAGE=en_US bun run dev`
3. Check server logs for errors and warnings
