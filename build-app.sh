#!/bin/bash
# ===========================================================================
#  把启动器打包成 macOS 应用（DSH Web.app）
#  无窗口：AppleScript applet 后台拉起 bin/dsh-web，Dock 里留图标，退出即停。
#  用法：./build-app.sh
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="DSH Web"
APP="$ROOT/$APP_NAME.app"
BUILD="$ROOT/.build"

say() { printf '  %s\n' "$*"; }

echo "== 1/4 生成图标 =="
ICON_PNG="$ROOT/assets/icon.png"
[ -f "$ICON_PNG" ] || node "$ROOT/tools/make-icon.mjs" "$ICON_PNG"

rm -rf "$BUILD"
mkdir -p "$BUILD/icon.iconset"
for s in 16 32 128 256 512; do
  sips -z "$s" "$s" "$ICON_PNG" --out "$BUILD/icon.iconset/icon_${s}x${s}.png" >/dev/null
  d=$((s * 2))
  sips -z "$d" "$d" "$ICON_PNG" --out "$BUILD/icon.iconset/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$BUILD/icon.iconset" -o "$BUILD/icon.icns"
say "icon.icns 就绪"

echo "== 2/4 编译 AppleScript 入口 =="
osacompile -s -o "$BUILD/$APP_NAME.app" "$ROOT/tools/app.applescript"
say "applet 编译完成"

echo "== 3/4 组装 app 包 =="
rm -rf "$APP"
mv "$BUILD/$APP_NAME.app" "$APP"
cp "$BUILD/icon.icns" "$APP/Contents/Resources/icon.icns"
mkdir -p "$APP/Contents/Resources/launcher"
cp -R "$ROOT/bin" "$APP/Contents/Resources/launcher/bin"
cp "$ROOT/DSH Web.command" "$APP/Contents/Resources/launcher/"
chmod -R 755 "$APP/Contents/Resources/launcher/bin"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>zh_CN</string>
  <key>CFBundleDisplayName</key><string>DSH Web</string>
  <key>CFBundleName</key><string>DSH Web</string>
  <key>CFBundleExecutable</key><string>applet</string>
  <key>CFBundleIconFile</key><string>icon.icns</string>
  <key>CFBundleIdentifier</key><string>local.dsh.web-launcher</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleSignature</key><string>aplt</string>
  <key>CFBundleShortVersionString</key><string>2.1.0</string>
  <key>CFBundleVersion</key><string>6</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.developer-tools</string>
  <key>NSAppleScriptEnabled</key><true/>
  <key>OSAAppletStayOpen</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

plutil -lint "$APP/Contents/Info.plist" >/dev/null
say "Info.plist 校验通过"

# 改了包内容，重新做本地临时签名
rm -rf "$APP/Contents/_CodeSignature"
if command -v codesign >/dev/null 2>&1; then
  codesign --force --sign - "$APP" >/dev/null 2>&1 && say "已做本地临时签名" || say "跳过签名（不影响本机使用）"
fi

echo "== 4/4 收尾 =="
touch "$APP"
rm -rf "$BUILD"
echo
echo "完成：$APP"
echo "双击即可启动（不弹终端窗口）；也可以运行 ./install.sh 装到“应用程序”。"
