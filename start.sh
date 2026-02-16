#!/bin/bash
# 启动脚本 - 读取配置并启动服务

CONFIG_FILE="/root/mowan-game-pro/config.ini"

# 从配置文件读取端口
PORT=$(awk -F= '/^\[server\]/{found=1} found && /^port=/{print $2; exit}' "$CONFIG_FILE")
PORT=${PORT:-3000}

# 导出环境变量并启动
export NODE_ENV=production
export PORT

cd /root/mowan-game-pro
exec /usr/bin/npm start
