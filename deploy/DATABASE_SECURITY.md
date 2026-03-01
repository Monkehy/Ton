# 🔐 数据库安全配置指南

## 核心原则：数据库与资金分离

### ✅ 你的架构是安全的！

**为什么？**

1. **资金在链上**：所有 TON 存储在智能合约中
2. **合约不可篡改**：部署后代码固化
3. **数据库只是日志**：记录业务数据，不控制资金
4. **多签保护**：冷钱包需要 2/3 签名才能转账

**即使黑客完全控制数据库，也无法：**
- ❌ 转走合约中的 TON
- ❌ 修改链上游戏结果
- ❌ 绕过合约逻辑提款
- ❌ 伪造区块链交易

---

## 🎯 但数据库仍需保护！

虽然无法盗取资金，但黑客可以：

### 危害 1：业务数据篡改
- 修改用户积分（虚假排行榜）
- 篡改推荐关系（窃取推荐奖励）
- 伪造游戏历史

### 危害 2：隐私泄露
- 用户钱包地址
- 游戏历史和金额
- IP 地址和地理位置

### 危害 3：服务中断
- 删除数据库
- 注入恶意数据
- 导致服务崩溃

---

## 🛡️ 数据库安全配置（必做）

### 1. PostgreSQL 安全配置

#### 1.1 修改默认端口
```bash
# 编辑 PostgreSQL 配置
sudo nano /etc/postgresql/*/main/postgresql.conf

# 修改端口（默认 5432 → 自定义）
port = 54321  # 改成其他端口
```

#### 1.2 禁止远程 root 登录
```bash
# 编辑访问控制
sudo nano /etc/postgresql/*/main/pg_hba.conf

# 只允许本地连接
local   all             postgres                                peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# 禁止所有外部连接
# host    all             all             0.0.0.0/0               reject
```

#### 1.3 使用强密码
```bash
# 生成强密码
openssl rand -base64 32

# 修改数据库密码
sudo -u postgres psql
ALTER USER ton_user WITH PASSWORD 'your_very_strong_password_here';
\q
```

#### 1.4 限制数据库权限
```sql
-- 只授予必要权限
REVOKE ALL ON DATABASE ton_dice_db FROM PUBLIC;
GRANT CONNECT ON DATABASE ton_dice_db TO ton_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ton_user;

-- 禁止 DROP 和 TRUNCATE
REVOKE DROP ON DATABASE ton_dice_db FROM ton_user;
```

---

### 2. 防火墙配置

#### 2.1 只开放必要端口
```bash
# UFW 防火墙规则
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 只开放必要端口
sudo ufw allow 22/tcp    # SSH（建议改成其他端口）
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# 禁止 PostgreSQL 外部访问
sudo ufw deny 5432/tcp
sudo ufw deny 54321/tcp  # 如果改了端口

sudo ufw enable
```

#### 2.2 修改 SSH 端口（强烈推荐）
```bash
# 编辑 SSH 配置
sudo nano /etc/ssh/sshd_config

# 修改端口
Port 2222  # 改成其他端口

# 禁止 root 登录
PermitRootLogin no

# 只允许密钥登录
PasswordAuthentication no
PubkeyAuthentication yes

# 重启 SSH
sudo systemctl restart sshd

# 更新防火墙
sudo ufw allow 2222/tcp
sudo ufw delete allow 22/tcp
```

---

### 3. 应用层安全

#### 3.1 使用 SQL 参数化查询
```typescript
// ✅ 安全：使用参数化查询
await db.query('SELECT * FROM users WHERE wallet = $1', [walletAddress]);

// ❌ 危险：字符串拼接（SQL 注入风险）
await db.query(`SELECT * FROM users WHERE wallet = '${walletAddress}'`);
```

#### 3.2 输入验证
```typescript
import { Address } from '@ton/ton';

// 验证钱包地址格式
function validateWalletAddress(address: string): boolean {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
}

// 验证金额范围
function validateAmount(amount: number): boolean {
  return amount >= 0.1 && amount <= 1000;
}
```

#### 3.3 限流保护
```typescript
// 已在 backend/.env 配置
RATE_LIMIT_WINDOW_SEC=10
RATE_LIMIT_MAX_REQUESTS=2

// 防止暴力破解和 DDoS
```

---

### 4. 数据库备份

#### 4.1 自动备份脚本
```bash
#!/bin/bash
# /usr/local/bin/backup-database.sh

BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="ton_dice_db"

mkdir -p $BACKUP_DIR

# 备份数据库
sudo -u postgres pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# 只保留最近 7 天的备份
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

#### 4.2 设置 Cron 定时任务
```bash
# 添加执行权限
chmod +x /usr/local/bin/backup-database.sh

# 编辑 crontab
crontab -e

# 每天凌晨 3 点自动备份
0 3 * * * /usr/local/bin/backup-database.sh
```

#### 4.3 备份到云存储（推荐）
```bash
# 使用 rclone 同步到云存储
rclone sync /var/backups/postgresql remote:backups/postgresql
```

---

### 5. 数据完整性验证

#### 5.1 链上数据 vs 数据库数据
```typescript
// 定期对账：检查数据库记录是否与链上一致
async function verifyGameResults() {
  const dbResults = await db.query('SELECT * FROM game_results WHERE verified = false');
  
  for (const result of dbResults) {
    // 从区块链查询实际结果
    const onChainResult = await queryBlockchain(result.tx_hash);
    
    // 对比
    if (result.result !== onChainResult.result) {
      // 记录异常
      console.error('Data mismatch detected!', result.id);
      await alertAdmin(result.id);
    } else {
      // 标记为已验证
      await db.query('UPDATE game_results SET verified = true WHERE id = $1', [result.id]);
    }
  }
}

// 每小时运行一次
setInterval(verifyGameResults, 3600000);
```

#### 5.2 审计日志
```typescript
// 记录所有敏感操作
async function auditLog(action: string, userId: string, details: any) {
  await db.query(
    'INSERT INTO audit_logs (action, user_id, details, ip_address, timestamp) VALUES ($1, $2, $3, $4, NOW())',
    [action, userId, JSON.stringify(details), req.ip]
  );
}

// 使用示例
await auditLog('WITHDRAW', user.id, { amount: 100, address: '...' });
```

---

### 6. 监控和告警

#### 6.1 监控异常查询
```bash
# 启用 PostgreSQL 慢查询日志
sudo nano /etc/postgresql/*/main/postgresql.conf

# 添加配置
log_min_duration_statement = 1000  # 记录超过 1 秒的查询
log_connections = on
log_disconnections = on
log_duration = on
```

#### 6.2 监控脚本
```bash
#!/bin/bash
# /usr/local/bin/monitor-database.sh

# 检查异常连接
CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='ton_dice_db';")

if [ $CONNECTIONS -gt 50 ]; then
  echo "⚠️ 警告：数据库连接数过多 ($CONNECTIONS)"
  # 发送告警（可以集成 Telegram Bot、Email 等）
fi

# 检查数据库大小
DB_SIZE=$(sudo -u postgres psql -t -c "SELECT pg_size_pretty(pg_database_size('ton_dice_db'));")
echo "数据库大小: $DB_SIZE"
```

---

### 7. SSL/TLS 加密连接

#### 7.1 生成 SSL 证书
```bash
# 生成自签名证书（测试用）
sudo openssl req -new -x509 -days 365 -nodes -text -out /etc/postgresql/*/main/server.crt -keyout /etc/postgresql/*/main/server.key

# 设置权限
sudo chmod 600 /etc/postgresql/*/main/server.key
sudo chown postgres:postgres /etc/postgresql/*/main/server.*
```

#### 7.2 启用 SSL
```bash
# 编辑配置
sudo nano /etc/postgresql/*/main/postgresql.conf

# 启用 SSL
ssl = on
ssl_cert_file = '/etc/postgresql/*/main/server.crt'
ssl_key_file = '/etc/postgresql/*/main/server.key'

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

#### 7.3 应用连接使用 SSL
```typescript
// backend/.env
DATABASE_URL=postgres://ton_user:password@localhost:5432/ton_dice_db?sslmode=require
```

---

## 🚨 应急响应计划

### 发现数据库被入侵？

#### 1. 立即隔离
```bash
# 断开所有数据库连接
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='ton_dice_db' AND pid <> pg_backend_pid();"

# 停止应用服务
pm2 stop all

# 阻止外部访问
sudo ufw deny from any to any
```

#### 2. 评估损失
```bash
# 查看审计日志
sudo -u postgres psql ton_dice_db -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100;"

# 检查异常修改
sudo -u postgres psql ton_dice_db -c "SELECT * FROM game_results WHERE updated_at > NOW() - INTERVAL '1 hour';"
```

#### 3. 恢复数据
```bash
# 从最近的备份恢复
gunzip -c /var/backups/postgresql/backup_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql ton_dice_db
```

#### 4. 重新验证
```bash
# 从区块链重新同步所有游戏结果
npm run sync-from-blockchain
```

#### 5. 更改所有密码
```bash
# 数据库密码
sudo -u postgres psql
ALTER USER ton_user WITH PASSWORD 'new_very_strong_password';

# 应用密码
nano backend/.env
# 更新 DATABASE_URL 和 JWT_SECRET
```

---

## 📊 安全检查清单

### 部署前检查

- [ ] 数据库使用强密码（16+ 位）
- [ ] 禁止数据库远程访问
- [ ] 修改 PostgreSQL 默认端口
- [ ] 启用 SSL 连接
- [ ] 配置防火墙规则
- [ ] 禁止 root 直接登录
- [ ] 修改 SSH 默认端口
- [ ] 限制数据库用户权限
- [ ] 配置自动备份
- [ ] 启用审计日志

### 运行时检查

- [ ] 定期检查异常查询
- [ ] 监控数据库连接数
- [ ] 验证链上数据一致性
- [ ] 检查审计日志
- [ ] 测试备份恢复流程
- [ ] 更新系统补丁
- [ ] 监控磁盘空间

---

## 🎯 总结：双重保护

### 第一层：区块链保护资金
- ✅ 资金在智能合约中
- ✅ 合约逻辑不可篡改
- ✅ 多签冷钱包保护
- ✅ 链上可验证

### 第二层：数据库保护业务
- ✅ 强密码 + 防火墙
- ✅ 输入验证 + 参数化查询
- ✅ 定期备份 + 审计日志
- ✅ 链上数据对账验证

**即使数据库被完全攻破，资金仍然安全！**

---

## 📞 需要帮助？

- 查看完整配置脚本：`deploy/secure-database.sh`
- 查看监控脚本：`deploy/monitor-database.sh`
- 查看备份脚本：`deploy/backup-database.sh`
