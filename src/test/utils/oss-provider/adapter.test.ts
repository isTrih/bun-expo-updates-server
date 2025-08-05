import { expect, test, describe, beforeAll, mock } from "bun:test";
import {
  OSSProviderFactory,
  OSSManager,
  setupDefaultOSS,
  createOSSConfig,
  getDefaultOSS,
} from "../../../utils/oss-provider/factory";
import { DogeCloudAdapter } from "../../../utils/oss-provider/dogecloud-adapter";
import { S3Adapter } from "../../../utils/oss-provider/s3-adapter";
import type { IOSSProvider } from "../../../utils/oss-provider/types";

// Mock redis for testing
mock.module("bun", () => ({
  redis: {
    get: mock().mockResolvedValue(null),
    set: mock().mockResolvedValue("OK"),
    del: mock().mockResolvedValue(1),
  },
}));

// Mock environment variables
const originalEnv = process.env;

describe("OSS Provider Factory", () => {
  beforeAll(() => {
    // Setup test environment variables
    process.env.DOGE_CLOUD_ACCESS_KEY = "test-access-key";
    process.env.DOGE_CLOUD_SECRET_KEY = "test-secret-key";
    process.env.AWS_ACCESS_KEY_ID = "test-aws-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-aws-secret-key";
    process.env.AWS_REGION = "us-east-1";
  });

  test("should create singleton factory instance", () => {
    const factory1 = OSSProviderFactory.getInstance();
    const factory2 = OSSProviderFactory.getInstance();
    expect(factory1).toBe(factory2);
  });

  test("should register and list available providers", () => {
    const factory = OSSProviderFactory.getInstance();
    const providers = factory.getAvailableProviders();

    expect(providers).toContain("dogecloud");
    expect(providers).toContain("s3");
  });

  test("should check if provider is supported", () => {
    const factory = OSSProviderFactory.getInstance();

    expect(factory.isProviderSupported("dogecloud")).toBe(true);
    expect(factory.isProviderSupported("s3")).toBe(true);
    expect(factory.isProviderSupported("unsupported")).toBe(false);
  });

  test("should register custom provider", () => {
    const factory = OSSProviderFactory.getInstance();

    class CustomProvider implements IOSSProvider {
      getBucketName(): string {
        return "test";
      }
      async listObjects(): Promise<any> {
        return {};
      }
      async getObject(): Promise<any> {
        return {};
      }
      async putObject(): Promise<void> {}
      async deleteObject(): Promise<void> {}
      async headObject(): Promise<any> {
        return {};
      }
    }

    factory.registerProvider("custom", CustomProvider);
    expect(factory.isProviderSupported("custom")).toBe(true);
  });

  test("should throw error for unsupported provider", async () => {
    const factory = OSSProviderFactory.getInstance();
    const config = createOSSConfig("unsupported" as any, "test-bucket");

    await expect(factory.createProvider(config)).rejects.toThrow(
      "Unsupported OSS provider",
    );
  });
});

describe("createOSSConfig", () => {
  test("should create valid config object", () => {
    const config = createOSSConfig("dogecloud", "test-bucket", {
      accessKey: "key",
      secretKey: "secret",
    });

    expect(config).toEqual({
      provider: "dogecloud",
      bucket: "test-bucket",
      accessKey: "key",
      secretKey: "secret",
    });
  });

  test("should create config with minimal parameters", () => {
    const config = createOSSConfig("s3", "test-bucket");

    expect(config).toEqual({
      provider: "s3",
      bucket: "test-bucket",
    });
  });
});

describe("OSSManager", () => {
  test("should initialize manager with config", async () => {
    const config = createOSSConfig("dogecloud", "test-bucket");
    const manager = new OSSManager(config);

    // Mock the DogeCloudAdapter initialization
    const mockInitialize = mock().mockResolvedValue(undefined);
    DogeCloudAdapter.prototype.initialize = mockInitialize;

    await manager.initialize();

    expect(manager.getConfig()).toEqual(config);
    expect(manager.getProvider()).toBeDefined();
  });

  test("should throw error when accessing provider before initialization", () => {
    const config = createOSSConfig("dogecloud", "test-bucket");
    const manager = new OSSManager(config);

    expect(() => manager.getProvider()).toThrow("OSS Manager not initialized");
  });

  test("should update config and reinitialize", async () => {
    const config = createOSSConfig("dogecloud", "test-bucket");
    const manager = new OSSManager(config);

    // Mock initialization
    const mockInitialize = mock().mockResolvedValue(undefined);
    DogeCloudAdapter.prototype.initialize = mockInitialize;

    await manager.initialize();

    const newConfig = { bucket: "new-bucket" };
    await manager.updateConfig(newConfig);

    const updatedConfig = manager.getConfig();
    expect(updatedConfig.bucket).toBe("new-bucket");
    expect(updatedConfig.provider).toBe("dogecloud"); // Should keep original provider
  });
});

describe("Default OSS Management", () => {
  test("should setup and get default OSS", async () => {
    const config = createOSSConfig("dogecloud", "default-bucket");

    // Mock initialization
    const mockInitialize = mock().mockResolvedValue(undefined);
    DogeCloudAdapter.prototype.initialize = mockInitialize;

    await setupDefaultOSS(config);

    const defaultOSS = getDefaultOSS();
    expect(defaultOSS).toBeDefined();
    expect(defaultOSS.getConfig().bucket).toBe("default-bucket");
  });

  test("should throw error when getting default OSS before setup", () => {
    // Reset default OSS by requiring a fresh instance
    expect(() => getDefaultOSS()).toThrow("Default OSS not configured");
  });
});

describe("DogeCloud Adapter", () => {
  test("should create DogeCloud adapter with config", () => {
    const config = createOSSConfig("dogecloud", "test-bucket", {
      accessKey: "test-key",
      secretKey: "test-secret",
    });

    const adapter = new DogeCloudAdapter(config);
    expect(adapter.getBucketName()).toBe("test-bucket");
  });

  test("should throw error without credentials", () => {
    // Temporarily remove env vars
    delete process.env.DOGE_CLOUD_ACCESS_KEY;
    delete process.env.DOGE_CLOUD_SECRET_KEY;

    const config = createOSSConfig("dogecloud", "test-bucket");

    expect(() => new DogeCloudAdapter(config)).toThrow(
      "DogeCloud access key and secret key are required",
    );

    // Restore env vars
    process.env.DOGE_CLOUD_ACCESS_KEY = "test-access-key";
    process.env.DOGE_CLOUD_SECRET_KEY = "test-secret-key";
  });
});

describe("S3 Adapter", () => {
  test("should create S3 adapter with config", () => {
    const config = createOSSConfig("s3", "test-bucket", {
      region: "us-west-2",
      accessKey: "test-key",
      secretKey: "test-secret",
    });

    const adapter = new S3Adapter(config);
    expect(adapter.getBucketName()).toBe("test-bucket");
  });

  test("should use environment variables for credentials", () => {
    const config = createOSSConfig("s3", "test-bucket");
    const adapter = new S3Adapter(config);
    expect(adapter.getBucketName()).toBe("test-bucket");
  });

  test("should throw error without credentials", () => {
    // Temporarily remove env vars
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    const config = createOSSConfig("s3", "test-bucket");

    expect(() => new S3Adapter(config)).toThrow(
      "AWS S3 access key and secret key are required",
    );

    // Restore env vars
    process.env.AWS_ACCESS_KEY_ID = "test-aws-access-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-aws-secret-key";
  });

  test("should support custom endpoint", () => {
    const config = createOSSConfig("s3", "test-bucket", {
      endpoint: "https://minio.example.com",
      accessKey: "test-key",
      secretKey: "test-secret",
    });

    const adapter = new S3Adapter(config);
    expect(adapter.getBucketName()).toBe("test-bucket");
  });
});

describe("Provider Interface Compliance", () => {
  test("DogeCloud adapter should implement all required methods", () => {
    const config = createOSSConfig("dogecloud", "test-bucket");
    const adapter = new DogeCloudAdapter(config);

    expect(typeof adapter.getBucketName).toBe("function");
    expect(typeof adapter.listObjects).toBe("function");
    expect(typeof adapter.getObject).toBe("function");
    expect(typeof adapter.putObject).toBe("function");
    expect(typeof adapter.deleteObject).toBe("function");
    expect(typeof adapter.headObject).toBe("function");
    expect(typeof adapter.generatePresignedUrl).toBe("function");
  });

  test("S3 adapter should implement all required methods", () => {
    const config = createOSSConfig("s3", "test-bucket");
    const adapter = new S3Adapter(config);

    expect(typeof adapter.getBucketName).toBe("function");
    expect(typeof adapter.listObjects).toBe("function");
    expect(typeof adapter.getObject).toBe("function");
    expect(typeof adapter.putObject).toBe("function");
    expect(typeof adapter.deleteObject).toBe("function");
    expect(typeof adapter.headObject).toBe("function");
    expect(typeof adapter.generatePresignedUrl).toBe("function");
  });
});

describe("Error Handling", () => {
  test("should handle invalid provider gracefully", async () => {
    const factory = OSSProviderFactory.getInstance();
    const config = { provider: "invalid", bucket: "test" } as any;

    await expect(factory.createProvider(config)).rejects.toThrow();
  });

  test("should handle missing configuration", () => {
    expect(() => createOSSConfig("" as any, "")).toThrow();
  });
});
