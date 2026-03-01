#!/bin/bash

# ============================================
# TON Dice Game 自动化部署脚本
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 root 权限运行此脚本"
    exit 1
fi

print_info "🚀 开始部署 TON Dice Game..."

# ============================================
# 1. 收集部署信息
# ============================================

echo ""
echo "请输入部署信息："
read -p "服务器 IP 地址: " SERVER_IP
read -p "域名 (例如: dice.yourdomain.com): " DOMAIN
read -p "数据库密码 (留空使用随机密码): " DB_PASSWORD

if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(openssl rand -base64 32)
    print_info "生成的数据库密码: $DB_PASSWORD"
fi

# ============================================
# 2. 更新系统
# ============================================

print_info "📦 更新系统软件包..."
apt update
apt upgrade -y

# ============================================
# 3. 安装依赖
# ============================================

print_info "📦 安装必要依赖..."

# 安装 Node.js 20.x
if ! command -v node &> /dev/null; then
    print_info "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    print_info "Node.js 已安装: $(node -v)"
fi

# 安装 PostgreSQL
if ! command -v psql &> /dev/null; then
    print_info "安装 PostgreSQL..."
    apt install -y postgresql postgresql-contrib
else
    print_info "PostgreSQL 已安装"
fi

# 安装 Nginx
if ! command -v nginx &> /dev/null; then
    print_info "安装 Nginx..."
    apt install -y nginx
else
    print_info "Nginx 已安装"
fi

# 安装 Certbot (Let's Encrypt)
if ! command -v certbot &> /dev/null; then
    print_info "安装 Certbot..."
    apt install -y certbot python3-certbot-nginx
else
    print_info "Certbot 已安装"
fi

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
    print_info "安装 PM2..."
    npm install -g pm2
else
    print_info "PM2 已安装"
fi

# 安装 Git
apt install -y git

# ============================================
# 4. 配置 PostgreSQL
# ============================================

print_info "🗄️  配置 PostgreSQL..."

# 启动 PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
-- 删除已存在的数据库和用户（如果有）
DROP DATABASE IF EXISTS ton_tma_v1;
DROP USER IF EXISTS ton_user;

-- 创建新用户
CREATE USER ton_user WITH PASSWORD '$DB_PASSWORD';

-- 创建数据库
CREATE DATABASE ton_tma_v1 OWNER ton_user;

-- 授权
GRANT ALL PRIVILEGES ON DATABASE ton_tma_v1 TO ton_user;
EOF

print_info "✅ 数据库配置完成"

# ============================================
# 5. 创建项目目录
# ============================================

print_info "📁 创建项目目录..."

PROJECT_DIR="/var/www/ton-dice"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# ============================================
# 6. 复制项目文件（需要从本地上传）
# ============================================

print_warn "⚠️  请在本地机器运行以下命令上传项目文件："
echo ""
echo "rsync -avz --exclude 'node_modules' --exclude '.git' /Users/feng/Documents/Ton/ root@$SERVER_IP:$PROJECT_DIR/"
echo ""
read -p "文件上传完成后按回车继续..."

# ============================================
# 7. 配置后端环境变量
# ============================================

print_info "⚙️  配置后端环境变量..."

cat > $PROJECT_DIR/backend/.env << EOF
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL=postgresql://ton_user:$DB_PASSWORD@localhost:5432/ton_tma_v1

# Testnet 配置
CHAIN_PROVIDER=ton_testnet
TONAPI_BASE_URL=https://testnet.tonapi.io
TON_TESTNET_CONTRACT_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
TON_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
TON_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS

TONAPI_TIMEOUT_MS=8000
TON_RPC_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC

SCORE_CONFIRM_POLL_MS=5000
MOCK_CONFIRM_DELAY_MS=15000
MOCK_CONFIRMED_AMOUNT_NANO=1000000000

RATE_LIMIT_WINDOW_SEC=10
RATE_LIMIT_MAX_REQUESTS=2

RESERVE_FLOOR_TON=10
MIN_AMOUNT_TON=0.1
SAFETY_FACTOR=0.02
EOF

# ============================================
# 8. 配置前端环境变量
# ============================================

print_info "⚙️  配置前端环境变量..."

cat > $PROJECT_DIR/frontend/.env << EOF
VITE_API_BASE=https://$DOMAIN/api
VITE_DEV_MOCK=false

VITE_DICE_GAME_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
VITE_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
VITE_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS
VITE_NETWORK=testnet
EOF

# ============================================
# 9. 安装依赖并构建
# ============================================

print_info "📦 安装后端依赖..."
cd $PROJECT_DIR/backend
npm install --production

print_info "📦 安装前端依赖..."
cd $PROJECT_DIR/frontend
npm install
npm run build

# ============================================
# 10. 配置 PM2
# ============================================

print_info "⚙️  配置 PM2..."

cat > $PROJECT_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'ton-backend',
      cwd: '$PROJECT_DIR/backend',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '$PROJECT_DIR/logs/backend-error.log',
      out_file: '$PROJECT_DIR/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
EOF

# 创建日志目录
mkdir -p $PROJECT_DIR/logs

# 启动后端
cd $PROJECT_DIR
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_info "✅ 后端服务已启动"

# ============================================
# 11. 配置 Nginx
# ============================================

print_info "⚙️  配置 Nginx..."

cat > /etc/nginx/sites-available/ton-dice << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 前端（静态文件）
    location / {
        root $PROJECT_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理到后端
    location /api {
        rewrite ^/api/(.*) /\$1 break;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志
    access_log /var/log/nginx/ton-dice-access.log;
    error_log /var/log/nginx/ton-dice-error.log;
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/ton-dice /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx

print_info "✅ Nginx 配置完成"

# ============================================
# 12. 配置 HTTPS (Let's Encrypt)
# ============================================

print_info "🔒 配置 HTTPS 证书..."

certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

print_info "✅ HTTPS 证书配置完成"

# ============================================
# 13. 配置防火墙
# ============================================

print_info "🔥 配置防火墙..."

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

print_info "✅ 防火墙配置完成"

# ============================================
# 完成
# ============================================

echo ""
echo "============================================"
print_info "🎉 部署完成！"
echo "============================================"
echo ""
echo "📊 部署信息："
echo "  - 域名: https://$DOMAIN"
echo "  - API: https://$DOMAIN/api"
echo "  - 数据库密码: $DB_PASSWORD"
echo ""
echo "📝 管理命令："
echo "  - 查看服务状态: pm2 status"
echo "  - 查看日志: pm2 logs"
echo "  - 重启服务: pm2 restart all"
echo "  - 停止服务: pm2 stop all"
echo ""
echo "🔗 下一步："
echo "  1. 访问 https://$DOMAIN 测试网站"
echo "  2. 在 Telegram BotFather 创建 Mini App"
echo "  3. 配置 Mini App URL 为 https://$DOMAIN"
echo ""
print_warn "⚠️  请妥善保存数据库密码！"
echo ""
