# DSH Web Launcher

给 [`npx @deepseek-ai/dsh web`](https://www.npmjs.com/package/@deepseek-ai/dsh) 套一个 macOS 一键启动：双击即用，不弹终端窗口，自动等就绪再打开专属浏览器窗口；退出 app 就停服务。

[English](README.en.md)

## 特性

| | |
|---|---|
| **一键启动** | 双击 `/Applications/DSH Web.app`，后台跑 `npx @deepseek-ai/dsh web` 并打开界面。 |
| **不弹终端** | 启动器在后台运行；退出 app 会把服务和端口一起收掉。 |
| **立刻有反馈** | 浏览器马上打开「正在启动」页，服务就绪后自动跳进 DSH。 |
| **专属窗口** | Chromium app 模式（无地址栏、无标签页），独立 profile `~/.dsh-web-launcher/browser-profile`，跟你日常浏览完全隔离。 |
| **逐级兜底** | 没 Chromium → Safari 专属窗口（按 window id 复用）；没 Safari → 默认浏览器标签页。 |
| **不重复开窗** | 再点一次只会把已有窗口切到前面；需要换页面时在同一个窗口里导航，不再新开。 |
| **加载不露白屏** | 服务就绪后先在进度页背后把界面加载完，再切过来。 |
| **端口处理** | 已有实例在跑就直接复用（不重复起）；默认端口被占用时自动换一个。 |
| **干净退出** | 退出时递归杀掉 `npx → dsh` 整棵进程树，不留孤儿进程占端口。 |
| **日志** | 都在 `~/.dsh-web-launcher/logs/`，失败时 app 和进度页都会给出提示。 |

## 要求

- macOS 11+
- Node.js **24.9+**（`dsh` 的 engines 要求）
- 可选：Chromium（或 Chrome / Edge / Brave / Arc）用于无地址栏的 app 窗口

> macOS 12 上，新版 Chromium 要求 macOS 13。仓库里的 [`tools/probe-chromium.mjs`](tools/probe-chromium.mjs) 会用 HTTP Range 直接读 zip 里的 `Info.plist`，帮你找到「还能在你系统上跑的最新 Chromium」。

## 快速开始

```bash
git clone https://github.com/<you>/dsh-web-launcher.git
cd dsh-web-launcher

./build-app.sh      # 编译 AppleScript 入口并生成图标
./install.sh        # 把 DSH Web.app 装到 /Applications
```

然后从启动台/聚焦打开 **DSH Web**，或直接双击 `/Applications/DSH Web.app`。

- 首次启动会在本地安装一份 dsh（约 1 分钟），之后冷启动约 **7 秒**
- 期间会看到进度页，就绪后自动跳转
- 退出 app（`Cmd+Q` 或 Dock → 退出）即停止服务

## 命令行

同一套脚本也能直接在终端用，排错很方便：

```bash
./bin/dsh-web                  # 默认 127.0.0.1:3080
./bin/dsh-web --port 8090
./bin/dsh-web --workspace ~/code
./bin/dsh-web --check          # 只打印环境报告，不启动
./bin/dsh-web --help
```

双击 `DSH Web.command` 也可以在终端里跑同一个脚本，方便实时看日志。

## 配置

参数：`--port`、`--host`、`--workspace`、`--no-open`、`--new`、`--timeout`、`--check`。

环境变量（都可选）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DSH_PKG_SPEC` | `@deepseek-ai/dsh` | 传给 `npx` 的包名，可在此锁版本 |
| `DSH_WEB_PORT` | `3080` | 监听端口 |
| `DSH_WEB_HOST` | `127.0.0.1` | 监听地址 |
| `DSH_WEB_WORKSPACE` | `~/Documents/deepseek-harness/default-workspace` | 服务的工作目录 |
| `DSH_WEB_NO_OPEN` | `0` | `1` = 不自动开浏览器 |
| `DSH_WEB_BOOT_TIMEOUT` | `300` | 等待就绪的秒数 |
| `DSH_WEB_LOG_DIR` | `~/.dsh-web-launcher/logs` | 日志目录 |
| `DSH_WEB_NPX` | `npx` | 自定义 npx 路径 |
| `DSH_WEB_BROWSER_PROFILE` | `~/.dsh-web-launcher/browser-profile` | Chromium profile 目录 |
| `DSH_WEB_BOOT_PAGE` | `1` | 设为 `0` 可关闭进度页 |
| `DSH_WEB_PKG_DIR` | `~/.dsh-web-launcher/pkg` | 本地安装的 dsh 副本位置 |
| `DSH_WEB_LOCAL_PKG` | `1` | `0` = 每次都走 npx（会慢约 6 秒） |

## 工作原理

```
DSH Web.app  (AppleScript applet, stay-open)
   └─ bin/dsh-web                    编排脚本
        ├─ bin/dsh-open              决定用哪个浏览器窗口
        │    ├─ Chromium --app=… --user-data-dir=…   （优先）
        │    └─ AppleScript → Safari 专属窗口（记录 id）
        ├─ bin/dsh-browser-focus    通过本地调试端口找到/切换已有窗口
        ├─ bin/dsh-browser-stage    在进度页背后把界面加载完再切过去
        ├─ bin/dsh-boot-page         「正在启动」页的小 HTTP 服务
        └─ npx @deepseek-ai/dsh web --host … --port … --no-open
             └─ 打印 "dsh web: http://127.0.0.1:PORT/?token=…"
```

1. applet 在后台拉起编排脚本，自己留在 Dock 里，退出时负责收尸。
2. 编排脚本先起一个进度页服务（`端口 + 100`）并打开，然后启动 `dsh web`。
3. 它从 dsh 输出里抓出**带 token 的地址**——直接访问 `http://127.0.0.1:3080` 会 401，必须先用 launch token 换 cookie——再交给进度页。
4. 进度页跳转，窗口留下；退出 app 时整棵进程树一起被杀掉。

## 排错

```bash
./bin/dsh-web --check                          # 环境体检
tail -50 ~/.dsh-web-launcher/last-run.log      # 最近一次启动输出
ls -lt ~/.dsh-web-launcher/logs | head         # 每次运行的 dsh 日志
```

- **401 / 需要认证**：浏览器还没拿到该端口的 cookie。用打印出来的 `?token=…` 地址打开一次即可（进度页正常情况下会代劳）。
- **双击没反应**：先看 `last-run.log`。启动脚本如果秒退（例如已有实例在跑），applet 会自动退出。
- **Chromium 起不来**：快照版只支持它声明的 macOS 版本，用 `tools/probe-chromium.mjs` 查 `LSMinimumSystemVersion`。
- **提示「DSH Web 想要控制 Safari」**：只在走 Safari 兜底时出现，授权一次即可。
- **移动 app 后图标不对**：`touch "/Applications/DSH Web.app"` 刷新 LaunchServices 缓存。

## 卸载

```bash
rm -rf "/Applications/DSH Web.app" ~/.dsh-web-launcher
```

## 说明

- 图标由 `assets/whale.png` 生成（DeepSeek 的鲸鱼素材）。若要更换品牌，替换该图后重新 `node tools/make-icon.mjs`。
- 脚本输出与注释为中文；欢迎提交英文文案的 PR。
- 没有做公证（notarization），本地 ad-hoc 签名，自用足够。
- 启动器给 Chromium 开了一个本地调试端口（默认 `9333`，只监听 `127.0.0.1`），用来定位和切换自己的窗口；可用 `DSH_WEB_BROWSER_DEBUG_PORT` 改端口。

## License

[MIT](LICENSE)
