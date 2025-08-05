import Elysia from "elysia";
import {
  getAssetMetadataAsync,
  getMetadataAsync,
  getExpoConfigAsync,
  getLatestUpdateBundlePathForRuntimeVersionAsync,
  createRollBackDirectiveAsync,
  NoUpdateAvailableError,
  getDirectoryContents,
  createNoUpdateAvailableDirectiveAsync,
} from "../utils/helper-oss";
import {
  serializeDictionary,
  convertToDictionaryItemsRepresentation,
  signRSASHA256,
  convertSHA256HashToUUID,
  getPrivateKeyAsync,
} from "../utils/util";
// 更新类型枚举
enum UpdateType {
  NORMAL_UPDATE,
  ROLLBACK,
}

// ElysiaJS Context 类型
interface ElysiaContext {
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | string[] | undefined>;
  set: {
    headers: Record<string, string | number>;
    status?: number | string;
    redirect?: string;
    cookie?: Record<string, any>;
  };
}

// 获取更新类型
async function getTypeOfUpdateAsync(
  updateBundlePath: string,
): Promise<UpdateType> {
  const directoryContents = await getDirectoryContents(`${updateBundlePath}/`);
  return directoryContents.includes("rollback")
    ? UpdateType.ROLLBACK
    : UpdateType.NORMAL_UPDATE;
}

// 处理普通更新响应
async function putUpdateInResponseAsync(
  context: ElysiaContext,
  updateBundlePath: string,
  runtimeVersion: string,
  platform: string,
  protocolVersion: number,
): Promise<Response> {
  const { headers, set } = context;

  const currentUpdateId = headers["expo-current-update-id"];
  const { metadataJson, createdAt, id } = await getMetadataAsync({
    updateBundlePath,
    runtimeVersion,
  });

  // NoUpdateAvailable directive only supported on protocol version 1
  // for protocol version 0, serve most recent update as normal
  if (
    currentUpdateId === convertSHA256HashToUUID(id) &&
    protocolVersion === 1
  ) {
    throw new NoUpdateAvailableError();
  }

  const expoConfig = await getExpoConfigAsync({
    updateBundlePath,
    runtimeVersion,
  });

  const platformSpecificMetadata = metadataJson.fileMetadata[platform];
  const manifest = {
    id: convertSHA256HashToUUID(id),
    createdAt,
    runtimeVersion,
    assets: await Promise.all(
      (platformSpecificMetadata.assets as any[]).map((asset: any) =>
        getAssetMetadataAsync({
          updateBundlePath,
          filePath: asset.path,
          ext: asset.ext,
          runtimeVersion,
          platform,
          isLaunchAsset: false,
        }),
      ),
    ),
    launchAsset: await getAssetMetadataAsync({
      updateBundlePath,
      filePath: platformSpecificMetadata.bundle,
      isLaunchAsset: true,
      runtimeVersion,
      platform,
      ext: null,
    }),
    metadata: {},
    extra: {
      expoClient: expoConfig,
    },
  };

  let signature = null;
  const expectSignatureHeader = headers["expo-expect-signature"];
  // console.log(expectSignatureHeader);
  if (expectSignatureHeader) {
    const privateKey = await getPrivateKeyAsync();
    // console.log(privateKey);
    if (!privateKey) {
      set.status = 400;
      return new Response(
        JSON.stringify({
          error:
            "Code signing requested but no key supplied when starting server.",
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }
    const manifestString = JSON.stringify(manifest);
    const hashSignature = signRSASHA256(manifestString, privateKey);
    const dictionary = convertToDictionaryItemsRepresentation({
      sig: hashSignature,
      keyid: "main",
    });
    signature = serializeDictionary(dictionary);
  }

  const assetRequestHeaders: { [key: string]: object } = {};
  [...manifest.assets, manifest.launchAsset].forEach((asset) => {
    assetRequestHeaders[asset.key] = {
      "test-header": "test-header-value",
    };
  });
  function generateLongNumber(length: number) {
    let result = "";
    // 第一位避免为0，保证数字有效性
    result += Math.floor(Math.random() * 9) + 1;
    // 生成剩余位数
    for (let i = 1; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  // 生成24位数字字符串
  const longNumber = generateLongNumber(24);
  // 创建自定义的multipart/form-data内容---------------------------
  // const boundary = `----WebkitFormBoundary${Math.random().toString(36).substring(2, 18)}`;
  const boundary = `----------------------------${generateLongNumber(24)}`;

  let formData = "";

  // 添加manifest部分
  formData += `--${boundary}\r\n`;
  formData += `Content-Disposition: form-data; name="manifest"; filename="manifest"\r\n`;
  formData += `Content-Type: application/json; charset=utf-8\r\n`;
  if (signature) {
    formData += `expo-signature: ${signature}\r\n`; // 添加签名在Content-Type之后
  }
  formData += `\r\n`;
  formData += JSON.stringify(manifest);
  formData += `\r\n`;

  // 添加extensions部分
  formData += `--${boundary}\r\n`;
  formData += `Content-Disposition: form-data; name="extensions"; filename="extensions"\r\n`;
  formData += `Content-Type: application/json;charset=utf-8\r\n`;
  formData += `\r\n`;
  formData += JSON.stringify({ assetRequestHeaders });
  formData += `\r\n`;

  // 结束边界
  formData += `--${boundary}--\r\n`;
  // 设置响应头
  const responseHeaders: Record<string, string> = {
    "expo-protocol-version": protocolVersion.toString(),
    "expo-sfv-version": "0",
    "cache-control": "private, max-age=0",
    "content-type": `multipart/mixed; boundary=${boundary}`,
  };
  // const
  //   form = new FormData();

  // // 创建manifest blob
  // const manifestBlob = new Blob([JSON.stringify(manifest)], {
  //   type: "application/json; charset=utf-8",
  // });
  // form.append("manifest", manifestBlob, "manifest");

  // // 创建extensions blob
  // const extensionsBlob = new Blob([JSON.stringify({ assetRequestHeaders })], {
  //   type: "application/json",
  // });
  // form.append("extensions", extensionsBlob, "extensions.json");

  // // 设置响应头
  // const responseHeaders: Record<string, string> = {
  //   "expo-protocol-version": protocolVersion.toString(),
  //   "expo-sfv-version": "0",
  //   "cache-control": "private, max-age=0",
  //   "content-type": `multipart/mixed; boundary=${(form as any)._boundary || "boundary"}`,
  // };

  // if (signature) {
  //   responseHeaders["expo-signature"] = signature;
  // }
  // // 获取FormData的原始数据和边界
  // const formDataArrayBuffer = await new Response(form).arrayBuffer();
  // const formDataString = new TextDecoder().decode(formDataArrayBuffer);
  // const boundaryMatch = formDataString.match(/^--([^\r\n]+)/);

  // if (!boundaryMatch) {
  //   throw new Error("Could not extract boundary from FormData");
  // }

  // const boundary = boundaryMatch[1];

  // // 如果有签名，在manifest部分的Content-Type后插入签名
  // let modifiedFormData = formDataString;
  // if (signature) {
  //   // 匹配manifest部分的Content-Type行
  //   const manifestContentTypeRegex =
  //     /(Content-Type: application\/json; charset=utf-8\r\n)/;
  //   modifiedFormData = formDataString.replace(
  //     manifestContentTypeRegex,
  //     `$1expo-signature: ${signature}\r\n`,
  //   );
  // }

  return new Response(formData, {
    status: 200,
    headers: responseHeaders,
  });
}

// 处理回滚响应
async function putRollBackInResponseAsync(
  context: ElysiaContext,
  updateBundlePath: string,
  protocolVersion: number,
): Promise<Response> {
  const { headers, set } = context;

  if (protocolVersion === 0) {
    throw new Error("Rollbacks not supported on protocol version 0");
  }

  const embeddedUpdateId = headers["expo-embedded-update-id"];
  if (!embeddedUpdateId || typeof embeddedUpdateId !== "string") {
    throw new Error(
      "Invalid Expo-Embedded-Update-ID request header specified.",
    );
  }

  const currentUpdateId = headers["expo-current-update-id"];
  if (currentUpdateId === embeddedUpdateId) {
    throw new NoUpdateAvailableError();
  }

  const directive = await createRollBackDirectiveAsync(updateBundlePath);

  let signature = null;
  const expectSignatureHeader = headers["expo-expect-signature"];
  if (expectSignatureHeader) {
    const privateKey = await getPrivateKeyAsync();
    if (!privateKey) {
      set.status = 400;
      return new Response(
        JSON.stringify({
          error:
            "Code signing requested but no key supplied when starting server.",
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }
    const directiveString = JSON.stringify(directive);
    const hashSignature = signRSASHA256(directiveString, privateKey);
    const dictionary = convertToDictionaryItemsRepresentation({
      sig: hashSignature,
      keyid: "main",
    });
    signature = serializeDictionary(dictionary);
  }

  const form = new FormData();
  const directiveBlob = new Blob([JSON.stringify(directive)], {
    type: "application/json; charset=utf-8",
  });
  form.append("directive", directiveBlob, "directive.json");

  // 设置响应头
  const responseHeaders: Record<string, string> = {
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
    "cache-control": "private, max-age=0",
    "content-type": `multipart/mixed; boundary=${(form as any)._boundary || "boundary"}`,
  };

  if (signature) {
    responseHeaders["expo-signature"] = signature;
  }

  return new Response(form, {
    status: 200,
    headers: responseHeaders,
  });
}

// 设置无可用更新响应
async function putNoUpdateAvailableInResponseAsync(
  context: ElysiaContext,
  protocolVersion: number,
): Promise<Response> {
  const { headers, set } = context;

  if (protocolVersion === 0) {
    throw new Error(
      "NoUpdateAvailable directive not available in protocol version 0",
    );
  }

  const directive = await createNoUpdateAvailableDirectiveAsync();

  let signature = null;
  const expectSignatureHeader = headers["expo-expect-signature"];

  if (expectSignatureHeader) {
    const privateKey = await getPrivateKeyAsync();
    if (!privateKey) {
      set.status = 400;
      return new Response(
        JSON.stringify({
          error:
            "Code signing requested but no key supplied when starting server.",
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }
    const directiveString = JSON.stringify(directive);
    const hashSignature = signRSASHA256(directiveString, privateKey);
    const dictionary = convertToDictionaryItemsRepresentation({
      sig: hashSignature,
      keyid: "main",
    });
    signature = serializeDictionary(dictionary);
  }

  const form = new FormData();
  const directiveBlob = new Blob([JSON.stringify(directive)], {
    type: "application/json; charset=utf-8",
  });
  form.append("directive", directiveBlob, "directive.json");

  // 设置响应头
  const responseHeaders: Record<string, string> = {
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
    "cache-control": "private, max-age=0",
    "content-type": `multipart/mixed; boundary=${(form as any)._boundary || "boundary"}`,
  };

  if (signature) {
    responseHeaders["expo-signature"] = signature;
  }

  return new Response(form, {
    status: 200,
    headers: responseHeaders,
  });
}

// Manifest API 端点
export const manifest = new Elysia().get("/api/manifest", async (context) => {
  const { headers, query, set } = context;

  // 验证协议版本
  const protocolVersionMaybeArray = headers["expo-protocol-version"];
  if (protocolVersionMaybeArray && Array.isArray(protocolVersionMaybeArray)) {
    set.status = 400;
    return { error: "Unsupported protocol version. Expected either 0 or 1." };
  }
  const protocolVersion = parseInt(protocolVersionMaybeArray ?? "0", 10);

  // 验证平台
  const platform = headers["expo-platform"] ?? query["platform"];
  if (platform !== "ios" && platform !== "android") {
    set.status = 400;
    return { error: "Unsupported platform. Expected either ios or android." };
  }

  // 验证运行时版本
  const runtimeVersion =
    headers["expo-runtime-version"] ?? query["runtime-version"];
  if (!runtimeVersion || typeof runtimeVersion !== "string") {
    set.status = 400;
    return { error: "No runtimeVersion provided." };
  }

  let updateBundlePath: string;
  try {
    updateBundlePath =
      await getLatestUpdateBundlePathForRuntimeVersionAsync(runtimeVersion);
  } catch (error: any) {
    set.status = 404;
    return { error: error.message };
  }

  const updateType = await getTypeOfUpdateAsync(updateBundlePath);

  try {
    try {
      if (updateType === UpdateType.NORMAL_UPDATE) {
        return await putUpdateInResponseAsync(
          context,
          updateBundlePath,
          runtimeVersion,
          platform,
          protocolVersion,
        );
      } else if (updateType === UpdateType.ROLLBACK) {
        return await putRollBackInResponseAsync(
          context,
          updateBundlePath,
          protocolVersion,
        );
      }
    } catch (maybeNoUpdateAvailableError) {
      if (maybeNoUpdateAvailableError instanceof NoUpdateAvailableError) {
        return await putNoUpdateAvailableInResponseAsync(
          context,
          protocolVersion,
        );
      }
      throw maybeNoUpdateAvailableError;
    }
  } catch (error: any) {
    console.error(error);
    set.status = 404;
    return { error: error.message || error };
  }
});
