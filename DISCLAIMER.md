# 免责声明 / Disclaimer

> 使用本项目即表示你已阅读并同意以下内容。如果你不同意，请不要下载或使用。

## 中文

1. **非官方项目。** 本仓库是一个第三方的 macOS 启动器（launcher），与 DeepSeek（深度求索）、GitHub 及任何浏览器厂商均无隶属、合作或背书关系。项目中出现的名称与图标仅用于说明用途。

2. **你的数据留在你自己的机器上。** 本启动器只负责在本机启动 `npx @deepseek-ai/dsh web` 并把浏览器指过去，不收集、不上传、不代理任何对话内容或凭据。访问令牌（token）只出现在本机日志与浏览器地址栏中；日志位置为 `~/.dsh-web-launcher/`，请自行决定是否保留。

3. **按「现状」提供，不提供担保。** 本项目以 MIT 许可发布，不附带任何明示或暗示的担保，包括但不限于适销性、特定用途适用性与不侵权。使用本软件造成的任何直接或间接损失（包括数据丢失、服务中断、账号问题），作者不承担责任。

4. **未签名、未公证。** 发布包使用本地 ad-hoc 签名，未经 Apple 公证。首次打开可能被 Gatekeeper 拦截，需要右键 → 打开，或在系统设置中放行。请只从本仓库的 Releases 下载，不要信任其他来源。

5. **第三方组件。** 本项目会调用 npm 包 `@deepseek-ai/dsh`（及其依赖）与 Chromium/Safari 浏览器；这些组件各自遵循其自身许可与隐私政策。图标基于 DeepSeek 的鲸鱼素材生成，相关权利归其所有者，若需再分发请自行替换。

6. **安全提示。** 服务默认只监听 `127.0.0.1`，不要改成对外地址或暴露到公网：那会让任何能访问该端口的人控制这台机器上的编码代理。

## English

1. **Unofficial.** This is a third‑party macOS launcher. It is not affiliated with, endorsed by, or supported by DeepSeek, GitHub, or any browser vendor. Names and icons are used descriptively only.

2. **Your data stays local.** The launcher only starts `npx @deepseek-ai/dsh web` on your machine and points a browser at it. It does not collect, upload, or proxy conversations or credentials. Tokens appear only in local logs (`~/.dsh-web-launcher/`) and the browser address bar.

3. **Provided “as is”, without warranty.** Released under the MIT License, without warranty of any kind, express or implied. The authors are not liable for any damages arising from its use.

4. **Unsigned and unnotarized.** Release builds are ad‑hoc signed and not notarized by Apple. Gatekeeper may block the first launch; use right‑click → Open, or allow it in System Settings. Download only from this repository's Releases.

5. **Third‑party components.** The launcher invokes the `@deepseek-ai/dsh` npm package (and its dependencies) and Chromium or Safari; those components carry their own licenses and privacy policies. The icon is derived from DeepSeek's whale artwork, which remains the property of its owner — replace it if you redistribute.

6. **Security.** The server listens on `127.0.0.1` only. Never expose it to a public interface: anyone who can reach the port can drive a coding agent on this machine.
