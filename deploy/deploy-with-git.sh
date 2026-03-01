#!/bin/bash
# ========================================
# Git 自动化部署脚本（服务器端）
# ========================================

set -e  # 遇到错误立即退出

# ========================================
# 配置变量（根据实际情况修改）
# ========================================
GIT_REPO="https://github.com/YOUR_USERNAME/ton-dice-game.git"  # 你的 Git 仓库地址
GIT_BRANCH="main"  # 分支名称（main 或 master）
DEPLOY_DIR="/var/www/ton-dice"  # 部署目录
DOMAIN="your-domain.com"  # 你的域名

# ========================================
# 颜色输出
# ========================================
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
echo_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }
echo_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# ========================================
# 检查是否为 root 用户
# ========================================
if [ "$EUID" -ne 0 ]; then
  echo_error "请使用 root 用户运行此脚本"
  exit 1
fi

# ========================================
# 第一步：安装必要软件
# ========================================
echo_info "安装必要软件..."

# 更新系统
apt update && apt upgrade -y

# 安装 Git
if ! command -v git &> /dev/null; then
  echo_info "安装 Git..."
  apt install -y git
else
  echo_success "Git 已安装"
fi

# 安装 Node.js
if ! command -v node &> /dev/null; then
  echo_info "安装 Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
else
  echo_success "Node.js 已安装: $(node -v)"
fi

# 安装 PM2
if ! command -v pm2 &> /dev/null; then
  echo_info "安装 PM2..."
  npm install -g pm2
else
  echo_success "PM2 已安装"
fi

# 安装 PostgreSQL
if ! command -v psql &> /dev/null; then
  echo_info "安装 PostgreSQL..."
  apt install -y postgresql postgresql-contrib
else
  echo_success "PostgreSQL 已安装"
fi

# 安装 Nginx
if ! command -v nginx &> /dev/null; then
  echo_info "安装 Nginx..."
  apt install -y nginx
else
  echo_success "Nginx 已安装"
fi

# 安装 Certbot（HTTPS）
if ! command -v certbot &> /dev/null; then
  echo_info "安装 Certbot..."
  apt install -y certbot python3-certbot-nginx
else
  echo_success "Certbot 已安装"
fi

# ========================================
# 第二步：克隆或更新代码
# ========================================
echo_info "处理代码仓库..."

if [ -d "$DEPLOY_DIR" ]; then
  echo_warning "目录已存在，尝试更新代码..."
  cd "$DEPLOY_DIR"
  
  # 检查是否是 Git 仓库
  if [ -d ".git" ]; then
    echo_info "拉取最新代码..."
    git fetch origin
    git reset --hard origin/$GIT_BRANCH
    git pull origin $GIT_BRANCH
    echo_success "代码更新完成"
  else
    echo_error "目录存在但不是 Git 仓库，请手动删除后重试"
    exit 1
  fi
else
  echo_info "克隆代码仓库..."
  mkdir -p /var/www
  cd /var/www
  git clone -b $GIT_BRANCH $GIT_REPO ton-dice
  cd ton-dice
  echo_success "代码克隆完成"
fi

# ========================================
# 第三步：配置数据库
# ========================================
echo_info "配置 PostgreSQL 数据库..."

# 启动 PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
-- 创建数据库
CREATE DATABASE ton_dice_db;

-- 创建用户
CREATE USER ton_user WITH PASSWORD 'your_secure_password_here';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE ton_dice_db TO ton_user;

-- 退出
\q
EOF

echo_success "数据库配置完成"

# ========================================
# 第四步：配置环境变量
# ========================================
echo_info "配置环境变量..."

# 后端 .env
cat > "$DEPLOY_DIR/backend/.env" << 'EOF'
# 数据库配置
DATABASE_URL=postgresql://ton_user:your_secure_password_here@localhost:5432/ton_dice_db

# TON 网络配置（Testnet）
CHAIN_PROVIDER=testnet
TON_RPC_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC
TONAPI_BASE_URL=https://testnet.tonapi.io

# 合约地址（替换为你的实际地址）
TON_TESTNET_CONTRACT_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
TON_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
TON_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS

# 服务器配置
PORT=3001
NODE_ENV=production
JWT_SECRET=your_jwt_secret_change_this
EOF

# 前端 .env
cat > "$DEPLOY_DIR/frontend/.env" << 'EOF'
# API 地址
VITE_API_BASE=https://api.your-domain.com

# TON 合约地址（Testnet）
VITE_DICE_GAME_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
VITE_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
VITE_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS

# 网络配置
VITE_NETWORK=testnet
EOF

echo_success "环境变量配置完成"
echo_warning "请手动编辑 .env 文件，替换为你的实际配置！"

# ========================================
# 第五步：安装依赖和构建
# ========================================
echo_info "安装后端依赖..."
cd "$DEPLOY_DIR/backend"
npm install --production

echo_info "安装前端依赖..."
cd "$DEPLOY_DIR/frontend"
npm install

echo_info "构建前端..."
npm run build

echo_success "构建完成"

# ========================================
# 第六步：启动后端服务（PM2）
# ========================================
echo_info "配置 PM2 启动后端..."

cd "$DEPLOY_DIR/backend"

# 创建 PM2 配置文件
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

# 停止旧进程
pm2 delete ton-dice-backend 2>/dev/null || true

# 启动新进程
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

echo_success "后端服务已启动"

# ========================================
# 第七步：配置 Nginx
# ========================================
echo_info "配置 Nginx..."

cat > /etc/nginx/sites-available/ton-dice << EOF
# 前端（主域名）
server {
    listen 80;
    server_name $DOMAIN;

    root $DEPLOY_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}

# 后端 API（api 子域名）
server {
    listen 80;
    server_name api.$DOMAIN;

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

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx

echo_success "Nginx 配置完成"

# ========================================
# 第八步：配置 HTTPS（Certbot）
# ========================================
echo_info "配置 HTTPS..."
echo_warning "请确保你的域名已正确解析到此服务器 IP！"
read -p "域名已解析？(yes/no): " dns_ready

if [ "$dns_ready" == "yes" ]; then
  certbot --nginx -d $DOMAIN -d api.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
  echo_success "HTTPS 配置完成"
else
  echo_warning "跳过 HTTPS 配置，你可以稍后手动运行："
  echo "certbot --nginx -d $DOMAIN -d api.$DOMAIN"
fi

# ========================================
# 第九步：配置防火墙
# ========================================
echo_info "配置防火墙..."

ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

echo_success "防火墙配置完成"

# ========================================
# 完成
# ========================================
echo ""
echo_success "=========================================="
echo_success "  🎉 部署完成！"
echo_success "=========================================="
echo ""
echo_info "访问地址："
echo "  前端: http://$DOMAIN (或 https://$DOMAIN)"
echo "  后端 API: http://api.$DOMAIN/health"
echo ""
echo_info "后续更新代码："
echo "  cd $DEPLOY_DIR && git pull && cd frontend && npm run build && pm2 restart all"
echo ""
echo_warning "⚠️  别忘了："
echo "  1. 编辑 backend/.env 和 frontend/.env"
echo "  2. 替换合约地址和 API 密钥"
echo "  3. 修改数据库密码和 JWT_SECRET"
echo ""
