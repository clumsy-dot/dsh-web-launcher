#!/bin/bash
# ===========================================================================
#  安装启动器：拷贝到「应用程序」
#  用法：./install.sh            装到 /Applications（不动桌面）
#        ./install.sh --shortcut 装到 /Applications，并在桌面放快捷方式
#        ./install.sh --desktop  只放桌面（不需要管理员权限）
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="DSH Web"
SRC="$ROOT/$APP_NAME.app"
DEST="/Applications/$APP_NAME.app"
MODE="${1:-}"

# 旧名字（DSH Web 启动器）装的副本，升级时一并清掉
OLD_APP="/Applications/DSH Web 启动器.app"
OLD_LINK="$HOME/Desktop/DSH Web 启动器"
rm -rf "$OLD_APP" "$OLD_LINK" 2>/dev/null || true

if [ ! -d "$SRC" ]; then
  echo "还没有打包，先执行： ./build-app.sh"
  exit 1
fi

if [ "$MODE" = "--desktop" ]; then
  rm -rf "$HOME/Desktop/$APP_NAME.app"
  cp -R "$SRC" "$HOME/Desktop/"
  echo "已放到桌面：$HOME/Desktop/$APP_NAME.app"
  exit 0
fi

# ---- 装到 /Applications ----
if rm -rf "$DEST" 2>/dev/null && cp -R "$SRC" /Applications/ 2>/dev/null; then
  echo "已安装：$DEST"
else
  echo "没有写入 /Applications 的权限，请手动执行："
  echo "  sudo rm -rf \"$DEST\" && sudo cp -R \"$SRC\" /Applications/"
  echo "或者只放桌面： ./install.sh --desktop"
  exit 1
fi

# ---- 桌面快捷方式（可选） ----
if [ "$MODE" = "--shortcut" ]; then
  ln -sfn "$DEST" "$HOME/Desktop/$APP_NAME" && echo "桌面快捷方式：$HOME/Desktop/$APP_NAME"
else
  rm -f "$HOME/Desktop/$APP_NAME" 2>/dev/null || true
fi

# ---- 刷新图标缓存 ----
touch "$DEST" 2>/dev/null || true
echo
echo "完成。在「应用程序」里双击「${APP_NAME}」即可启动。"
