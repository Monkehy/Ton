# 🚀 Git 部署快速开始

## 📋 完整流程（5 分钟搞定）

### 第 1 步：本地推送代码到 Git

#### 1.1 创建 GitHub 仓库

访问 https://github.com/new

- 仓库名：`ton-dice-game`
- 类型：**Private**（私有）
- 不要初始化任何文件

点击 **Create repository**

#### 1.2 推送本地代码

在你的电脑上运行：

```bash
cd /Users/feng/Documents/Ton

# 初始化 Git（如果还没初始化）
git init

# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/ton-dice-game.git

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: TON Dice Game"

# 推送（如果失败，看下面的解决方法）
git push -u origin main
```

**如果推送失败（分支名问题）：**

```bash
git branch -M main
git push -u origin main
```

**如果需要输入用户名和密码：**

- 用户名：你的 GitHub 用户名
- 密码：需要使用 **Personal Access Token**（不是登录密码）

生成 Token：https://github.com/settings/tokens

---

### 第 2 步：在服务器部署

#### 2.1 修改部署脚本配置

在本地编辑 `deploy/deploy-with-git.sh`：

```bash
# 修改这些变量
GIT_REPO="https://github.com/YOUR_USERNAME/ton-dice-game.git"  # 你的仓库地址
GIT_BRANCH="main"  # 或 master
DOMAIN="your-domain.com"  # 你的域名
```

保存并提交：

```bash
git add deploy/deploy-with-git.sh
git commit -m "Update deployment config"
git push
```

#### 2.2 SSH 登录服务器

```bash
ssh root@YOUR_SERVER_IP
```

#### 2.3 运行一键部署脚本

```bash
# 下载并运行部署脚本
curl -o deploy.sh https://raw.githubusercontent.com/YOUR_USERNAME/ton-dice-game/main/deploy/deploy-with-git.sh

# 添加执行权限
chmod +x deploy.sh

# 运行
./deploy.sh
```

**或者直接一行命令：**

```bash
bash <(curl -s https://raw.githubusercontent.com/YOUR_USERNAME/ton-dice-game/main/deploy/deploy-with-git.sh)
```

等待 5-10 分钟，自动完成所有部署步骤！

---

### 第 3 步：配置环境变量

部署完成后，需要修改配置文件：

```bash
# 编辑后端配置
nano /var/www/ton-dice/backend/.env

# 编辑前端配置
nano /var/www/ton-dice/frontend/.env
```

**需要修改的内容：**

1. 数据库密码
2. JWT_SECRET
3. 合约地址（使用你已部署的 Testnet 合约）
4. 域名

保存后重启服务：

```bash
cd /var/www/ton-dice
cd frontend && npm run build
pm2 restart all
```

---

### 第 4 步：配置域名 DNS

在你的域名提供商（如阿里云、Cloudflare）添加 DNS 记录：

| 类型 | 名称 | 值 | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 600 |
| A | api | YOUR_SERVER_IP | 600 |

等待 DNS 生效（5-30 分钟）

---

### 第 5 步：配置 HTTPS

DNS 生效后，运行：

```bash
certbot --nginx -d your-domain.com -d api.your-domain.com
```

输入邮箱，同意协议，自动配置完成！

---

## 🔄 后续如何更新代码？

### 本地开发完成后：

```bash
cd /Users/feng/Documents/Ton

# 提交更改
git add .
git commit -m "feat: 新功能描述"
git push
```

### 服务器更新：

```bash
ssh root@YOUR_SERVER_IP

cd /var/www/ton-dice

# 拉取最新代码
git pull

# 如果前端有改动
cd frontend && npm run build

# 如果后端有改动
cd backend && npm install

# 重启服务
pm2 restart all
```

---

## 🛠️ 常用命令

### 查看服务状态

```bash
pm2 status
pm2 logs ton-dice-backend
```

### 重启服务

```bash
pm2 restart all
```

### 查看 Nginx 日志

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 数据库操作

```bash
sudo -u postgres psql ton_dice_db
```

---

## 📍 已部署的 Testnet 合约地址

更新 `.env` 文件时使用这些地址：

```bash
# DiceGameV2 主合约
TON_TESTNET_CONTRACT_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut

# DepositVault 存款保险库
TON_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P

# PrizePool 奖池
TON_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS

# MultiSigColdWallet 冷钱包
COLD_WALLET_ADDRESS=kQD_18_1r54BdkGo40ajmhKpWCqDRUSrAqtV1yZSLEzC2Jha
```

---

## ⚠️ 重要提醒

### 安全性：

1. ✅ 使用 **Private** 私有仓库
2. ✅ 永远不要提交 `.env` 文件（已在 .gitignore 中）
3. ✅ 使用 SSH Key 而不是密码
4. ✅ 定期更换密钥和密码

### 检查清单：

- [ ] GitHub 仓库已创建（Private）
- [ ] 代码已推送到 GitHub
- [ ] 服务器已运行部署脚本
- [ ] `.env` 文件已配置
- [ ] DNS 已解析到服务器 IP
- [ ] HTTPS 证书已配置
- [ ] 防火墙已开放 80/443 端口
- [ ] 后端 API 可访问：`curl http://api.your-domain.com/health`
- [ ] 前端可访问：`https://your-domain.com`

---

## 🎯 完成后的访问地址

- **前端**：https://your-domain.com
- **后端 API**：https://api.your-domain.com
- **健康检查**：https://api.your-domain.com/health

---

## 🆘 遇到问题？

### 1. Git 推送失败

```bash
# 检查远程仓库
git remote -v

# 重新设置远程仓库
git remote set-url origin https://github.com/YOUR_USERNAME/ton-dice-game.git
```

### 2. 服务器克隆失败（私有仓库）

使用 Personal Access Token：

```bash
git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/ton-dice-game.git
```

或使用 SSH：

```bash
git clone git@github.com:YOUR_USERNAME/ton-dice-game.git
```

### 3. PM2 服务启动失败

```bash
pm2 logs
cd /var/www/ton-dice/backend
npm install
pm2 restart all
```

### 4. Nginx 配置错误

```bash
nginx -t
systemctl restart nginx
```

---

**准备好了就开始吧！🚀**
