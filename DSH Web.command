#!/bin/bash
# 双击这个文件即可启动 DSH Web（会自动打开一个终端窗口显示日志）
# 等价于：npx @deepseek-ai/dsh web
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/bin/dsh-web" "$@"
