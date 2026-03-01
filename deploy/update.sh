#!/bin/bash

# ============================================
# TON Dice Game 快速更新脚本
# ============================================

set -e

GREEN='\033[0;32m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# 服务器配置（首次部署后修改这些值）
SERVER_USER="root"
SERVER_IP="YOUR_SERVER_IP"
PROJECT_DIR="/var/www/ton-dice"

print_info "🔄 开始更新部署..."

# 1. 同步代码到服务器
print_info "📤 上传最新代码..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
  /Users/feng/Documents/Ton/ $SERVER_USER@$SERVER_IP:$PROJECT_DIR/

# 2. 在服务器上执行更新
print_info "🔨 构建项目..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /var/www/ton-dice

# 更新后端依赖
cd backend
npm install --production

# 更新前端依赖并构建
cd ../frontend
npm install
npm run build

# 重启服务
pm2 restart all

# 查看状态
pm2 status

ENDSSH

print_info "✅ 更新完成！"
print_info "📊 访问 https://your-domain.com 查看更新"
