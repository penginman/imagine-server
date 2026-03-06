#!/bin/bash

# 构建前端脚本
# 此脚本会克隆 peinture 项目，构建它，并将构建产物复制到 public 目录

set -e

TEMP_DIR="/tmp/peinture-build-$$"
FRONTEND_REPO="https://github.com/Amery2010/peinture.git"
PUBLIC_DIR="./public"

echo "🚀 开始构建前端..."

# 清理旧的 public 目录
if [ -d "$PUBLIC_DIR" ]; then
  echo "📦 清理旧的 public 目录..."
  rm -rf "$PUBLIC_DIR"
fi

# 克隆项目
echo "📥 克隆 peinture 项目..."
git clone "$FRONTEND_REPO" "$TEMP_DIR"

# 进入项目目录
cd "$TEMP_DIR"

# 安装依赖
echo "📦 安装依赖..."
# Vercel/pnpm 可能会把 pnpm-only 配置以 npm_config_* 环境变量形式传给 npm，
# 导致 npm 打印 "Unknown env config" 警告；这里显式清理这些变量，避免噪音并兼容未来 npm 版本。
unset npm_config_shamefully_hoist
unset npm_config_auto_install_peers
unset npm_config_strict_peer_dependencies
npm install

# 修改 vite.config.ts 添加 SERVICE_MODE 定义
echo "⚙️ 配置服务器模式..."
cat > vite.config.ts << 'VITE_CONFIG'
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_SERVICE_MODE': JSON.stringify(env.VITE_SERVICE_MODE || 'local')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
VITE_CONFIG

# 构建项目（注入服务器模式环境变量）
echo "🔨 构建项目（服务器模式）..."
VITE_SERVICE_MODE=server npm run build

# 返回原目录
cd -

# 复制构建产物
echo "📋 复制构建产物到 public 目录..."
cp -r "$TEMP_DIR/dist" "$PUBLIC_DIR"

# 清理临时目录
echo "🧹 清理临时文件..."
rm -rf "$TEMP_DIR"

echo "✅ 前端构建完成！"
echo "📁 静态文件已复制到: $PUBLIC_DIR"
