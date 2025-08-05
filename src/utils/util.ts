import { createHash, createSign } from "crypto";
import { readFile } from "fs/promises";
import path from "path";

// 将普通对象转换为 HTTP structured headers 中 Dictionary 格式
// Convert plain objects to Dictionary format in HTTP structured headers
export function convertToDictionaryItemsRepresentation(obj: {
  [key: string]: string;
}): Map<string, [string, Map<any, any>]> {
  return new Map(
    Object.entries(obj).map(([k, v]) => {
      return [k, [v, new Map()]];
    }),
  );
}
// 将dictionary格式序列化为字符串（符合HTTP structured headers规范）
// Serialize dictionary format to string (conforming to HTTP structured headers specification)
export function serializeDictionary(
  dict: Map<string, [string | number | boolean, Map<string, any>]>,
): string {
  const entries: string[] = [];

  // 遍历Map中的每个键值对
  dict.forEach((value, key) => {
    // 验证键是否符合token格式（只能包含a-zA-Z0-9!#$%&'*+-.^_`|~）
    // Validate if key conforms to token format (can only contain a-zA-Z0-9!#$%&'*+-.^_`|~)
    if (!/^[a-zA-Z0-9!#$%&'*+-.^_`|~]+$/.test(key)) {
      throw new Error(`Invalid key format: ${key}. Must be a valid token.`);
    }

    const [item, params] = value;
    let itemStr: string;

    // 序列化主项（item）
    // Serialize main item
    if (typeof item === "string") {
      // 字符串需要用双引号包裹，内部双引号需转义
      // Strings need to be wrapped in double quotes, internal double quotes need to be escaped
      itemStr = `"${item.replace(/"/g, '\\"')}"`;
    } else if (typeof item === "number") {
      // 数字直接序列化
      // Numbers are serialized directly
      itemStr = item.toString();
    } else if (typeof item === "boolean") {
      // 布尔值用?1和?0表示
      // Boolean values are represented by ?1 and ?0
      itemStr = item ? "?1" : "?0";
    } else {
      throw new Error(`Unsupported item type: ${typeof item}`);
    }

    // 序列化参数（parameters）
    // Serialize parameters
    const paramParts: string[] = [];
    params.forEach((paramValue, paramKey) => {
      // 参数键也需要符合token格式
      // Parameter keys also need to conform to token format
      if (!/^[a-zA-Z0-9!#$%&'*+-.^_`|~]+$/.test(paramKey)) {
        throw new Error(
          `Invalid parameter key: ${paramKey}. Must be a valid token.`,
        );
      }

      let paramValueStr: string;
      if (typeof paramValue === "string") {
        paramValueStr = `"${paramValue.replace(/"/g, '\\"')}"`;
      } else if (
        typeof paramValue === "number" ||
        typeof paramValue === "boolean"
      ) {
        paramValueStr = paramValue.toString();
      } else {
        throw new Error(
          `Unsupported parameter value type: ${typeof paramValue}`,
        );
      }

      paramParts.push(`${paramKey}=${paramValueStr}`);
    });

    // 组合项和参数
    // Combine item and parameters
    const entryParts = [itemStr];
    if (paramParts.length > 0) {
      entryParts.push(paramParts.join(";"));
    }

    entries.push(`${key}=${entryParts.join(";")}`);
  });

  // 用分号分隔所有键值对
  // Separate all key-value pairs with semicolons
  return entries.join("; ");
}
// 将 SHA256 的哈希转为 UUID 格式（用于标识符）
// Convert SHA256 hash to UUID format (used for identifiers)
export function convertSHA256HashToUUID(value: string) {
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(
    12,
    16,
  )}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
}

// 使用 RSA-SHA256 签名字符串（用于身份校验）
// Sign string using RSA-SHA256 (used for identity verification)
export function signRSASHA256(data: string, privateKey: string) {
  const sign = createSign("RSA-SHA256");
  sign.update(data, "utf8");
  sign.end();
  return sign.sign(privateKey, "base64");
}

// 读取 PEM 私钥（路径通过环境变量 PRIVATE_KEY_PATH 指定）
// Read PEM private key (path specified by environment variable PRIVATE_KEY_PATH)
export async function getPrivateKeyAsync() {
  const privateKeyPath = process.env.PRIVATE_KEY_PATH;
  if (!privateKeyPath) return null;
  const pemBuffer = await readFile(path.resolve(privateKeyPath));
  return pemBuffer.toString("utf8");
}
