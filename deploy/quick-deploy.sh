#!/bin/bash
# ========================================
# TON Dice Game 服务器部署脚本
# ========================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  🚀 TON Dice Game 部署"
echo "=========================================="
echo ""

# ========================================
# 第 1 步：更新系统
# ========================================
echo -e "${BLUE}[1/10]${NC} 更新系统..."
apt update && apt upgrade -y

# ========================================
# 第 2 步：安装 Git
# ========================================
echo -e "${BLUE}[2/10]${NC} 安装 Git..."
if ! command -v git &> /dev/null; then
  apt install -y git
fi
echo -e "${GREEN}✅ Git 已安装: $(git --version)${NC}"

# ========================================
# 第 3 步：安装 Node.js
# ========================================
echo -e "${BLUE}[3/10]${NC} 安装 Node.js 20.x..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo -e "${GREEN}✅ Node.js 已安装: $(node -v)${NC}"
echo -e "${GREEN}✅ npm 已安装: $(npm -v)${NC}"

# ========================================
# 第 4 步：安装 PM2
# ========================================
echo -e "${BLUE}[4/10]${NC} 安装 PM2..."
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 已安装${NC}"

# ========================================
# 第 5 步：安装 PostgreSQL
# ========================================
echo -e "${BLUE}[5/10]${NC} 安装 PostgreSQL..."
if ! command -v psql &> /dev/null; then
  apt install -y postgresql postgresql-contrib
  systemctl start postgresql
  systemctl enable postgresql
fi
echo -e "${GREEN}✅ PostgreSQL 已安装${NC}"

# ========================================
# 第 6 步：安装 Nginx
# ========================================
echo -e "${BLUE}[6/10]${NC} 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
  apt install -y nginx
  systemctl start nginx
  systemctl enable nginx
fi
echo -e "${GREEN}✅ Nginx 已安装${NC}"

# ========================================
# 第 7 步：克隆代码
# ========================================
echo -e "${BLUE}[7/10]${NC} 克隆代码仓库..."

# 创建目录
mkdir -p /var/www
cd /var/www

# 如果目录已存在，先备份
if [ -d "ton-dice" ]; then
  echo -e "${YELLOW}⚠️  目录已存在，创建备份...${NC}"
  mv ton-dice ton-dice.backup.$(date +%Y%m%d_%H%M%S)
fi

# 克隆代码
echo "请选择克隆方式："
echo "1. HTTPS (需要 Token)"
echo "2. SSH (需要 SSH Key)"
read -p "选择 [1/2]: " clone_method

if [ "$clone_method" == "2" ]; then
  # SSH 方式
  git clone git@github.com:Monkehy/Ton.git ton-dice
else
  # HTTPS 方式
  echo ""
  echo "请输入你的 GitHub Personal Access Token:"
  read -s github_token
  git clone https://${github_token}@github.com/Monkehy/Ton.git ton-dice
fi

cd ton-dice
echo -e "${GREEN}✅ 代码已克隆${NC}"

# ========================================
# 第 8 步：配置数据库
# ========================================
echo -e "${BLUE}[8/10]${NC} 配置 PostgreSQL 数据库..."

# 生成随机密码
DB_PASSWORD=$(openssl rand -base64 32)

# 创建数据库和用户
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS ton_dice_db;
DROP USER IF EXISTS ton_user;
CREATE DATABASE ton_dice_db;
CREATE USER ton_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE ton_dice_db TO ton_user;
\q
EOF

echo -e "${GREEN}✅ 数据库已创建${NC}"
echo -e "${YELLOW}数据库密码: $DB_PASSWORD${NC}"

# ========================================
# 第 9 步：配置环境变量
# ========================================
echo -e "${BLUE}[9/10]${NC} 配置环境变量..."

# 后端 .env
cat > /var/www/ton-dice/backend/.env << EOF
PORT=3001
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL=postgresql://ton_user:${DB_PASSWORD}@localhost:5432/ton_dice_db

# Testnet 配置
CHAIN_PROVIDER=ton_testnet
TONAPI_BASE_URL=https://testnet.tonapi.io
TON_RPC_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC

# 合约地址（替换为你的实际地址）
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

# JWT Secret
JWT_SECRET=$(openssl rand -base64 64)
EOF

# 前端 .env
read -p "请输入你的域名（例如：example.com）: " domain

cat > /var/www/ton-dice/frontend/.env << EOF
VITE_API_BASE=https://api.${domain}

# Testnet 合约地址
VITE_DICE_GAME_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
VITE_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
VITE_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS
VITE_NETWORK=testnet
VITE_DEV_MOCK=false
EOF

echo -e "${GREEN}✅ 环境变量已配置${NC}"

# ========================================
# 第 10 步：安装依赖并构建
# ========================================
echo -e "${BLUE}[10/10]${NC} 安装依赖并构建..."

# 安装后端依赖
echo "安装后端依赖..."
cd /var/www/ton-dice/backend
npm install --production

# 运行数据库迁移
echo "运行数据库迁移..."
npm run migrate || true

# 安装前端依赖
echo "安装前端依赖..."
cd /var/www/ton-dice/frontend
npm install

# 构建前端
echo "构建前端..."
npm run build

echo -e "${GREEN}✅ 依赖已安装，前端已构建${NC}"

# ========================================
# 第 11 步：启动后端服务
# ========================================
echo -e "${BLUE}[11/10]${NC} 启动后端服务..."

cd /var/www/ton-dice/backend

# 创建 PM2 配置
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ton-dice-backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# 构建后端
npm run build

# 启动服务
pm2 delete ton-dice-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 startup
pm2 save

echo -e "${GREEN}✅ 后端服务已启动${NC}"

# ========================================
# 第 12 步：配置 Nginx
# ========================================
echo -e "${BLUE}[12/10]${NC} 配置 Nginx..."

cat > /etc/nginx/sites-available/ton-dice << EOF
# 前端
server {
    listen 80;
    server_name ${domain};

    root /var/www/ton-dice/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

# 后端 API
server {
    listen 80;
    server_name api.${domain};

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

# 启用站点
ln -sf /etc/nginx/sites-available/ton-dice /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx

echo -e "${GREEN}✅ Nginx 已配置${NC}"

# ========================================
# 第 13 步：配置防火墙
# ========================================
echo -e "${BLUE}[13/10]${NC} 配置防火墙..."

if ! command -v ufw &> /dev/null; then
  apt install -y ufw
fi

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
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "=========================================="
echo ""
echo "📋 部署信息："
echo "  - 域名: ${domain}"
echo "  - 前端: http://${domain}"
echo "  - 后端 API: http://api.${domain}"
echo "  - 数据库密码: ${DB_PASSWORD}"
echo ""
echo "📊 服务状态："
echo "  - 后端: pm2 status"
echo "  - Nginx: systemctl status nginx"
echo "  - PostgreSQL: systemctl status postgresql"
echo ""
echo "🔧 常用命令："
echo "  - 查看日志: pm2 logs ton-dice-backend"
echo "  - 重启服务: pm2 restart all"
echo "  - 更新代码: cd /var/www/ton-dice && git pull"
echo ""
echo "⚠️  下一步："
echo "  1. 配置域名 DNS 解析到此服务器"
echo "  2. 安装 HTTPS 证书: certbot --nginx -d ${domain} -d api.${domain}"
echo "  3. 运行数据库安全配置: cd /var/www/ton-dice/deploy && ./secure-database.sh"
echo ""
