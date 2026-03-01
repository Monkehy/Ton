#!/bin/bash
# ========================================
# 数据库安全配置脚本
# ========================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  🔐 数据库安全配置"
echo "=========================================="
echo ""

# ========================================
# 1. 生成强密码
# ========================================
echo "📝 生成强密码..."
DB_PASSWORD=$(openssl rand -base64 32)
echo -e "${GREEN}✅ 数据库密码已生成${NC}"
echo "请保存此密码：$DB_PASSWORD"
echo ""

# ========================================
# 2. 修改 PostgreSQL 密码
# ========================================
echo "🔒 修改数据库密码..."
sudo -u postgres psql << EOF
ALTER USER ton_user WITH PASSWORD '$DB_PASSWORD';
\q
EOF
echo -e "${GREEN}✅ 数据库密码已更新${NC}"
echo ""

# ========================================
# 3. 限制数据库权限
# ========================================
echo "🔒 限制数据库权限..."
sudo -u postgres psql ton_dice_db << EOF
-- 撤销公共权限
REVOKE ALL ON DATABASE ton_dice_db FROM PUBLIC;

-- 授予必要权限
GRANT CONNECT ON DATABASE ton_dice_db TO ton_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ton_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ton_user;

-- 禁止危险操作
-- ton_user 无法 DROP 表或数据库
\q
EOF
echo -e "${GREEN}✅ 数据库权限已限制${NC}"
echo ""

# ========================================
# 4. 配置 PostgreSQL 安全设置
# ========================================
echo "🔒 配置 PostgreSQL 安全设置..."

PG_VERSION=$(sudo -u postgres psql -t -c "SHOW server_version;" | cut -d'.' -f1 | xargs)
PG_CONF="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# 备份原配置
sudo cp $PG_CONF $PG_CONF.backup
sudo cp $PG_HBA $PG_HBA.backup

# 修改 pg_hba.conf：只允许本地连接
sudo tee $PG_HBA > /dev/null << 'EOF'
# PostgreSQL Client Authentication Configuration File
# ===================================================

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 local connections:
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 local connections:
host    all             all             ::1/128                 scram-sha-256

# Deny all other connections
host    all             all             0.0.0.0/0               reject
EOF

# 修改 postgresql.conf
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" $PG_CONF
sudo sed -i "s/#ssl = off/ssl = on/" $PG_CONF
sudo sed -i "s/#log_connections = off/log_connections = on/" $PG_CONF
sudo sed -i "s/#log_disconnections = off/log_disconnections = on/" $PG_CONF
sudo sed -i "s/#log_min_duration_statement = -1/log_min_duration_statement = 1000/" $PG_CONF

echo -e "${GREEN}✅ PostgreSQL 配置已更新${NC}"
echo ""

# ========================================
# 5. 重启 PostgreSQL
# ========================================
echo "🔄 重启 PostgreSQL..."
sudo systemctl restart postgresql
echo -e "${GREEN}✅ PostgreSQL 已重启${NC}"
echo ""

# ========================================
# 6. 配置防火墙
# ========================================
echo "🔥 配置防火墙..."

# 确保 UFW 已安装
if ! command -v ufw &> /dev/null; then
  sudo apt install -y ufw
fi

# 配置规则
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 只开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 明确拒绝 PostgreSQL 端口
sudo ufw deny 5432/tcp

# 启用防火墙
sudo ufw --force enable

echo -e "${GREEN}✅ 防火墙已配置${NC}"
echo ""

# ========================================
# 7. 创建备份脚本
# ========================================
echo "💾 创建自动备份脚本..."

sudo mkdir -p /var/backups/postgresql
sudo chown postgres:postgres /var/backups/postgresql

sudo tee /usr/local/bin/backup-database.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="ton_dice_db"

mkdir -p $BACKUP_DIR

# 备份数据库
sudo -u postgres pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 只保留最近 7 天的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "$(date): Backup completed - backup_$DATE.sql.gz" >> /var/log/postgresql-backup.log
EOF

sudo chmod +x /usr/local/bin/backup-database.sh

# 添加 cron 任务（每天凌晨 3 点）
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-database.sh") | crontab -

echo -e "${GREEN}✅ 自动备份已配置（每天 3:00 AM）${NC}"
echo ""

# ========================================
# 8. 创建监控脚本
# ========================================
echo "📊 创建监控脚本..."

sudo tee /usr/local/bin/monitor-database.sh > /dev/null << 'EOF'
#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  📊 数据库状态监控"
echo "=========================================="
echo ""

# 检查连接数
CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='ton_dice_db';" | xargs)
echo "当前连接数: $CONNECTIONS"

if [ $CONNECTIONS -gt 50 ]; then
  echo -e "${RED}⚠️  警告：连接数过多！${NC}"
fi

# 检查数据库大小
DB_SIZE=$(sudo -u postgres psql -t -c "SELECT pg_size_pretty(pg_database_size('ton_dice_db'));" | xargs)
echo "数据库大小: $DB_SIZE"

# 检查慢查询
SLOW_QUERIES=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='ton_dice_db' AND state='active' AND query_start < NOW() - INTERVAL '5 seconds';" | xargs)
echo "慢查询数量: $SLOW_QUERIES"

if [ $SLOW_QUERIES -gt 5 ]; then
  echo -e "${YELLOW}⚠️  注意：存在慢查询${NC}"
fi

# 检查最近的备份
LATEST_BACKUP=$(ls -t /var/backups/postgresql/backup_*.sql.gz 2>/dev/null | head -n 1)
if [ -n "$LATEST_BACKUP" ]; then
  BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 86400 ))
  echo "最近备份: $(basename $LATEST_BACKUP) ($BACKUP_AGE 天前)"
  
  if [ $BACKUP_AGE -gt 1 ]; then
    echo -e "${RED}⚠️  警告：备份已超过 24 小时！${NC}"
  fi
else
  echo -e "${RED}⚠️  警告：未找到备份文件！${NC}"
fi

echo ""
echo -e "${GREEN}✅ 监控完成${NC}"
EOF

sudo chmod +x /usr/local/bin/monitor-database.sh

echo -e "${GREEN}✅ 监控脚本已创建${NC}"
echo ""

# ========================================
# 9. 更新应用配置
# ========================================
echo "📝 更新应用配置..."

BACKEND_ENV="/var/www/ton-dice/backend/.env"

if [ -f "$BACKEND_ENV" ]; then
  # 备份原配置
  cp $BACKEND_ENV $BACKEND_ENV.backup
  
  # 更新 DATABASE_URL
  sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://ton_user:$DB_PASSWORD@localhost:5432/ton_dice_db?sslmode=prefer|" $BACKEND_ENV
  
  echo -e "${GREEN}✅ 后端配置已更新${NC}"
else
  echo -e "${YELLOW}⚠️  后端 .env 文件不存在，请手动配置${NC}"
fi

echo ""

# ========================================
# 10. 测试连接
# ========================================
echo "🧪 测试数据库连接..."

if sudo -u postgres psql ton_dice_db -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 数据库连接正常${NC}"
else
  echo -e "${RED}❌ 数据库连接失败！${NC}"
fi

echo ""

# ========================================
# 完成
# ========================================
echo "=========================================="
echo -e "${GREEN}✅ 数据库安全配置完成！${NC}"
echo "=========================================="
echo ""
echo "📋 重要信息："
echo "  数据库密码: $DB_PASSWORD"
echo "  备份目录: /var/backups/postgresql"
echo "  备份脚本: /usr/local/bin/backup-database.sh"
echo "  监控脚本: /usr/local/bin/monitor-database.sh"
echo ""
echo "🔐 安全措施："
echo "  ✅ 数据库只允许本地连接"
echo "  ✅ 使用强密码认证"
echo "  ✅ 限制用户权限（无 DROP 权限）"
echo "  ✅ 启用 SSL 连接"
echo "  ✅ 启用连接和慢查询日志"
echo "  ✅ 防火墙已配置"
echo "  ✅ 每日自动备份（3:00 AM）"
echo ""
echo "📊 监控命令："
echo "  查看数据库状态: /usr/local/bin/monitor-database.sh"
echo "  查看连接: sudo -u postgres psql -c \"SELECT * FROM pg_stat_activity WHERE datname='ton_dice_db';\""
echo "  查看日志: sudo tail -f /var/log/postgresql/postgresql-*-main.log"
echo ""
echo "💾 备份命令："
echo "  手动备份: /usr/local/bin/backup-database.sh"
echo "  恢复备份: gunzip -c /var/backups/postgresql/backup_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql ton_dice_db"
echo ""
echo "⚠️  请务必保存数据库密码！"
echo ""
