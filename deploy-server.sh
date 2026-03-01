#!/bin/bash
# ========================================
# TON Dice Game 一键部署脚本
# ========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  🚀 TON Dice Game 一键部署"
echo "=========================================="
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 用户运行此脚本${NC}"
  exit 1
fi

# ========================================
# 第 1 步：更新系统并安装基础软件
# ========================================
echo -e "${BLUE}[1/11]${NC} 更新系统并安装基础软件..."
apt update && apt upgrade -y
apt install -y git curl wget ufw

# ========================================
# 第 2 步：安装 Node.js
# ========================================
echo -e "${BLUE}[2/11]${NC} 安装 Node.js 20.x..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"

# ========================================
# 第 3 步：安装 PM2
# ========================================
echo -e "${BLUE}[3/11]${NC} 安装 PM2..."
npm install -g pm2
echo -e "${GREEN}✅ PM2 已安装${NC}"

# ========================================
# 第 4 步：安装 PostgreSQL
# ========================================
echo -e "${BLUE}[4/11]${NC} 安装 PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
echo -e "${GREEN}✅ PostgreSQL 已安装${NC}"

# ========================================
# 第 5 步：安装 Nginx
# ========================================
echo -e "${BLUE}[5/11]${NC} 安装 Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✅ Nginx 已安装${NC}"

# ========================================
# 第 6 步：克隆代码
# ========================================
echo -e "${BLUE}[6/11]${NC} 克隆代码..."
mkdir -p /var/www
cd /var/www

if [ -d "ton-dice" ]; then
  echo -e "${YELLOW}⚠️  目录已存在，备份旧版本...${NC}"
  mv ton-dice ton-dice.backup.$(date +%Y%m%d_%H%M%S)
fi

echo ""
echo "仓库克隆方式："
echo "1. 公开仓库（直接克隆）"
echo "2. 私有仓库（需要 GitHub Token）"
read -p "选择 [1/2]: " clone_method

if [ "$clone_method" == "2" ]; then
  echo ""
  echo "请输入 GitHub Personal Access Token:"
  echo "（获取地址: https://github.com/settings/tokens）"
  read -s github_token
  echo ""
  git clone https://${github_token}@github.com/Monkehy/Ton.git ton-dice
else
  git clone https://github.com/Monkehy/Ton.git ton-dice
fi

cd ton-dice
echo -e "${GREEN}✅ 代码已克隆${NC}"

# ========================================
# 第 7 步：配置数据库
# ========================================
echo -e "${BLUE}[7/11]${NC} 配置数据库..."
DB_PASSWORD=$(openssl rand -base64 32)
echo "数据库密码: $DB_PASSWORD" > /root/ton_dice_credentials.txt

sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS ton_dice_db;
DROP USER IF EXISTS ton_user;
CREATE DATABASE ton_dice_db;
CREATE USER ton_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE ton_dice_db TO ton_user;
\q
EOF
echo -e "${GREEN}✅ 数据库已创建${NC}"

# ========================================
# 第 8 步：配置环境变量
# ========================================
echo -e "${BLUE}[8/11]${NC} 配置环境变量..."

# 询问域名
read -p "请输入你的域名（例如：example.com）: " DOMAIN
echo "域名: $DOMAIN" >> /root/ton_dice_credentials.txt

# 生成 JWT Secret
JWT_SECRET=$(openssl rand -base64 64)

# 后端 .env
cat > /var/www/ton-dice/backend/.env << EOF
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL=postgresql://ton_user:${DB_PASSWORD}@localhost:5432/ton_dice_db

CHAIN_PROVIDER=ton_testnet
TONAPI_BASE_URL=https://testnet.tonapi.io
TON_RPC_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC

TON_TESTNET_CONTRACT_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
TON_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
TON_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS

TONAPI_TIMEOUT_MS=8000
SCORE_CONFIRM_POLL_MS=5000
MOCK_CONFIRM_DELAY_MS=15000
MOCK_CONFIRMED_AMOUNT_NANO=1000000000

RATE_LIMIT_WINDOW_SEC=10
RATE_LIMIT_MAX_REQUESTS=2

RESERVE_FLOOR_TON=1000
MIN_AMOUNT_TON=0.1
SAFETY_FACTOR=0.02

JWT_SECRET=${JWT_SECRET}
EOF

# 前端 .env
cat > /var/www/ton-dice/frontend/.env << EOF
VITE_API_BASE=https://api.${DOMAIN}

VITE_DICE_GAME_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
VITE_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
VITE_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS
VITE_NETWORK=testnet
VITE_DEV_MOCK=false
EOF

echo -e "${GREEN}✅ 环境变量已配置${NC}"

# ========================================
# 第 9 步：安装依赖并构建
# ========================================
echo -e "${BLUE}[9/11]${NC} 安装依赖并构建（需要几分钟）..."

# 后端
cd /var/www/ton-dice/backend
npm install --production
npm run build

# 前端
cd /var/www/ton-dice/frontend
npm install
npm run build

echo -e "${GREEN}✅ 构建完成${NC}"

# ========================================
# 第 10 步：启动后端服务
# ========================================
echo -e "${BLUE}[10/11]${NC} 启动后端服务..."
cd /var/www/ton-dice/backend

pm2 delete ton-dice-backend 2>/dev/null || true
pm2 start dist/index.js --name ton-dice-backend -i max
pm2 startup
pm2 save

echo -e "${GREEN}✅ 后端服务已启动${NC}"

# ========================================
# 第 11 步：配置 Nginx
# ========================================
echo -e "${BLUE}[11/11]${NC} 配置 Nginx..."

cat > /etc/nginx/sites-available/ton-dice << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    root /var/www/ton-dice/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

server {
    listen 80;
    server_name api.${DOMAIN};

    location / {
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
}
EOF

ln -sf /etc/nginx/sites-available/ton-dice /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo -e "${GREEN}✅ Nginx 已配置${NC}"

# ========================================
# 第 12 步：配置防火墙
# ========================================
echo -e "${BLUE}[12/11]${NC} 配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}✅ 防火墙已配置${NC}"

# ========================================
# 完成
# ========================================
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "=========================================="
echo ""
echo "📋 部署信息（已保存到 /root/ton_dice_credentials.txt）："
cat /root/ton_dice_credentials.txt
echo ""
echo "📍 访问地址："
echo "  - 前端: http://${DOMAIN}"
echo "  - 后端 API: http://api.${DOMAIN}"
echo ""
echo "🔍 服务状态："
pm2 status
echo ""
echo "⚠️  重要提醒："
echo "  1. 配置域名 DNS："
echo "     - ${DOMAIN} → $(curl -s ifconfig.me)"
echo "     - api.${DOMAIN} → $(curl -s ifconfig.me)"
echo ""
echo "  2. 等待 DNS 生效（5-30 分钟）"
echo ""
echo "  3. 安装 HTTPS 证书："
echo "     apt install -y certbot python3-certbot-nginx"
echo "     certbot --nginx -d ${DOMAIN} -d api.${DOMAIN}"
echo ""
echo "🔧 常用命令："
echo "  - 查看日志: pm2 logs ton-dice-backend"
echo "  - 重启服务: pm2 restart all"
echo "  - 查看凭证: cat /root/ton_dice_credentials.txt"
echo ""
