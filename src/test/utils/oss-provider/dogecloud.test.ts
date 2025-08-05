import { expect, test } from "bun:test";
import { dogecloudApi } from "../../../utils/oss-provider/dogecloud";

test("dogecloudApi 应返回有效的凭证", async () => {
  const result = await dogecloudApi({
    apiPath: "/auth/tmp_token.json",
    data: {
      channel: "OSS_FULL",
      scopes: ["*"],
    },
    jsonMode: true,
  });

  expect(result).toHaveProperty("Credentials");
});
