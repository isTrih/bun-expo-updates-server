// utils/stream-to-buffer.ts
// 流转换为Buffer工具 / Stream to Buffer utility
import { Readable } from "stream";

/**
 * 将各种流类型转换为Buffer
 * Converts various stream types to Buffer
 *
 * 支持:
 * Supports:
 * - Node.js可读流 / Node.js Readable streams
 * - Web可读流 / Web ReadableStream
 * - AWS SDK流响应 (Readable & SdkStreamMixin) / AWS SDK stream responses (Readable & SdkStreamMixin)
 * - Buffer, Uint8Array
 * - 字符串 / String
 *
 * @param stream 要转换为Buffer的流或数据 / The stream or data to convert to Buffer
 * @returns 解析为Buffer的Promise / Promise resolving to a Buffer
 */
export async function streamToBuffer(stream: any): Promise<Buffer> {
  // 如果已经是Buffer，直接返回
  // If it's already a Buffer, return it directly
  if (Buffer.isBuffer(stream)) {
    return stream;
  }

  // 如果是字符串，转换为Buffer
  // If it's a string, convert to Buffer
  if (typeof stream === "string") {
    return Buffer.from(stream);
  }

  // 如果是Uint8Array，转换为Buffer
  // If it's a Uint8Array, convert to Buffer
  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }

  // 处理Web API的ReadableStream
  // Handle ReadableStream from Web API
  if (stream instanceof ReadableStream) {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    return Buffer.concat(chunks);
  }

  // 处理Node.js可读流(包括AWS SDK流)
  // Handle Node.js Readable streams (including AWS SDK streams)
  if (
    (stream && typeof stream.pipe === "function") ||
    (stream && typeof stream[Symbol.asyncIterator] === "function") ||
    stream instanceof Readable
  ) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // 如果到这里，说明无法处理这种类型
  // If we get here, we don't know how to handle this type
  throw new TypeError(`不支持的类型 / Unsupported type: ${typeof stream}`);
}
