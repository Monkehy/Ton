# 🔐 安全配置指南

## ⚠️ 重要：永远不要提交这些文件到 Git！

### 🚫 绝对禁止提交的文件

#### 1. 环境变量文件
```
backend/.env
frontend/.env
contracts/.env
.env
.env.local
.env.production
```

**为什么？** 包含数据库密码、API 密钥、JWT Secret 等敏感信息。

#### 2. 部署记录文件
```
deployment-testnet.json
deployment-mainnet.json
deployment-v2.json
```

**为什么？** 包含合约地址、部署者钱包地址等可能被攻击者利用的信息。

#### 3. 密钥和助记词
```
mnemonic.txt
seed.txt
private-keys/
wallets/
*.key
*.pem
```

**为什么？** 直接暴露会导致资金被盗！

#### 4. 数据库备份
```
*.sql
*.dump
*.db
database-backup/
```

**为什么？** 可能包含用户隐私数据。

---

## ✅ 已配置的安全措施

### 1. `.gitignore` 配置

已经帮你配置了完整的 `.gitignore`，会自动忽略以下内容：

- ✅ 所有 `.env` 文件
- ✅ 所有 `deployment-*.json` 文件
- ✅ 所有密钥文件（`.key`, `.pem` 等）
- ✅ 数据库备份文件
- ✅ 日志文件（可能包含敏感信息）
- ✅ node_modules 和构建产物

### 2. 示例配置文件

已创建示例配置文件供参考：

- ✅ `backend/.env.example` - 后端环境变量模板
- ✅ `frontend/.env.example` - 前端环境变量模板
- ✅ `deployment.example.json` - 部署记录模板

这些 `.example` 文件**可以提交**到 Git，因为不包含真实敏感信息。

---

## 🔍 检查是否泄露敏感信息

### 在推送代码前，运行以下命令检查：

```bash
cd /Users/feng/Documents/Ton

# 查看即将提交的文件
git status

# 查看具体改动（确保没有敏感信息）
git diff

# 检查是否有 .env 文件被追踪
git ls-files | grep -E '\.env$|\.env\..*$'

# 应该返回空或只有 .env.example
```

### 如果发现 `.env` 文件被追踪了：

```bash
# 从 Git 跟踪中移除（保留本地文件）
git rm --cached backend/.env
git rm --cached frontend/.env

# 提交移除操作
git commit -m "Remove sensitive .env files from Git"
```

---

## 🛡️ 推送前的安全检查清单

在执行 `git push` 之前，请确认：

- [ ] 没有 `.env` 文件（除了 `.env.example`）
- [ ] 没有 `deployment-*.json` 文件（除了 `deployment.example.json`）
- [ ] 没有助记词或私钥文件
- [ ] 没有数据库备份文件
- [ ] 代码中没有硬编码的密码、API Key、钱包地址
- [ ] 日志文件已被忽略

---

## 🔧 如何在新环境配置

### 克隆仓库后，需要手动创建配置文件：

#### 1. 后端配置

```bash
cd backend
cp .env.example .env
nano .env
```

修改以下内容：
- `DATABASE_URL` - 数据库连接字符串（修改密码）
- `JWT_SECRET` - JWT 密钥（生成随机字符串）
- `TON_*_ADDRESS` - 填入你部署的合约地址
- `TONAPI_API_KEY` - （可选）填入你的 API Key

#### 2. 前端配置

```bash
cd frontend
cp .env.example .env
nano .env
```

修改以下内容：
- `VITE_API_BASE` - 后端 API 地址
- `VITE_DICE_GAME_ADDRESS` - 游戏合约地址
- `VITE_DEPOSIT_VAULT_ADDRESS` - 存款合约地址
- `VITE_PRIZE_POOL_ADDRESS` - 奖池合约地址
- `VITE_NETWORK` - testnet 或 mainnet

---

## 🚨 如果不小心提交了敏感信息怎么办？

### 方法 1：删除最近的提交（仅限本地未推送）

```bash
# 撤销最后一次提交（保留修改）
git reset HEAD~1

# 从暂存区移除敏感文件
git rm --cached backend/.env

# 重新提交
git add .
git commit -m "Remove sensitive files"
```

### 方法 2：从历史记录中完全删除（已推送到远程）

⚠️ **警告：这会改写 Git 历史！**

```bash
# 使用 BFG Repo-Cleaner（推荐）
brew install bfg
bfg --delete-files .env --no-blob-protection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 强制推送
git push origin --force --all
```

### 方法 3：立即更改泄露的密钥

如果敏感信息已经公开：

1. **立即**修改数据库密码
2. **立即**重新生成 API Key
3. **立即**更换 JWT Secret
4. **如果是钱包私钥**：立即转移资金到新钱包
5. 通知团队成员

---

## 🔐 生产环境额外安全措施

### 1. 使用环境变量管理服务

推荐使用：
- **Doppler** - https://doppler.com
- **Vault by HashiCorp** - https://vaultproject.io
- **AWS Secrets Manager**
- **Google Cloud Secret Manager**

### 2. 服务器配置

在服务器上，`.env` 文件应该：

```bash
# 设置正确的权限（只有 root 和应用用户可读）
chmod 600 /var/www/ton-dice/backend/.env
chown www-data:www-data /var/www/ton-dice/backend/.env
```

### 3. CI/CD 配置

如果使用 GitHub Actions：

```yaml
# .github/workflows/deploy.yml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  # 在 GitHub Secrets 中配置，永不硬编码
```

---

## 📋 安全最佳实践

### 1. 密码强度要求

- ✅ 至少 16 位字符
- ✅ 包含大小写字母、数字、特殊符号
- ✅ 不要使用常见单词或生日
- ✅ 每个环境使用不同的密码

生成强密码：
```bash
openssl rand -base64 32
```

### 2. JWT Secret

生成强 JWT Secret：
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. 数据库安全

- ✅ 使用强密码
- ✅ 不允许远程 root 登录
- ✅ 配置防火墙，只允许本地连接
- ✅ 定期备份（加密存储）
- ✅ 使用 SSL 连接

### 4. API Key 管理

- ✅ 定期轮换
- ✅ 限制 API Key 权限（最小权限原则）
- ✅ 监控 API 使用情况
- ✅ 为不同环境使用不同的 Key

---

## 📞 发现安全问题？

如果你发现项目中的安全漏洞，请**私下**联系项目维护者，不要公开披露。

---

## ✅ 检查清单（推送前必读）

```bash
# 运行完整检查
cd /Users/feng/Documents/Ton

echo "=== 检查 .env 文件 ==="
find . -name ".env" -not -name ".env.example" -type f

echo "=== 检查部署文件 ==="
find . -name "deployment-*.json" -type f

echo "=== 检查密钥文件 ==="
find . -name "*.key" -o -name "*.pem" -o -name "mnemonic.txt" -type f

echo "=== 检查 Git 暂存区 ==="
git status

echo "=== 检查即将提交的内容 ==="
git diff --staged
```

**如果以上命令有任何输出（除了 .env.example），请不要推送！**

---

**记住：安全无小事，一旦泄露可能造成不可挽回的损失！** 🔐
