import { expect, test, describe, mock } from "bun:test";
import { streamToBuffer } from "../../utils/stream-to-buffer";
import { Readable } from "stream";

describe("streamToBuffer", () => {
  test("should convert Buffer to Buffer", async () => {
    const inputBuffer = Buffer.from("test data");
    const result = await streamToBuffer(inputBuffer);
    expect(result).toEqual(inputBuffer);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test("should convert string to Buffer", async () => {
    const input = "test string data";
    const result = await streamToBuffer(input);
    expect(result.toString()).toEqual(input);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test("should convert Uint8Array to Buffer", async () => {
    const input = new Uint8Array([116, 101, 115, 116]); // "test" in ASCII
    const result = await streamToBuffer(input);
    expect(result.toString()).toEqual("test");
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test("should convert Node.js Readable to Buffer", async () => {
    const stream = new Readable();
    stream.push("test ");
    stream.push("data");
    stream.push(null); // End the stream

    const result = await streamToBuffer(stream);
    expect(result.toString()).toEqual("test data");
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test("should convert async iterable to Buffer", async () => {
    const asyncIterable = {
      async *[Symbol.asyncIterator]() {
        yield Buffer.from("test ");
        yield Buffer.from("async ");
        yield Buffer.from("iterable");
      }
    };

    const result = await streamToBuffer(asyncIterable);
    expect(result.toString()).toEqual("test async iterable");
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test("should handle AWS SDK stream mock", async () => {
    // Create a mock that mimics an AWS SDK stream response
    // AWS SDK streams are Readable streams with an additional SdkStreamMixin
    const awsMockStream = new Readable();
    awsMockStream.push("aws ");
    awsMockStream.push("sdk ");
    awsMockStream.push("stream");
    awsMockStream.push(null);

    // Add a mock property that mimics SdkStreamMixin
    Object.defineProperty(awsMockStream, "transformToByteArray", {
      value: mock().mockReturnValue(Promise.resolve(new Uint8Array([]))),
      enumerable: true
    });

    const result = await streamToBuffer(awsMockStream);
    expect(result.toString()).toEqual("aws sdk stream");
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test("should throw on unsupported types", async () => {
    await expect(streamToBuffer(123)).rejects.toThrow(TypeError);
    await expect(streamToBuffer({})).rejects.toThrow(TypeError);
    await expect(streamToBuffer(null)).rejects.toThrow(TypeError);
    await expect(streamToBuffer(undefined)).rejects.toThrow(TypeError);
  });
});
