# 🚀 使用 Git 部署（推荐方式）

## 为什么用 Git？

✅ **更专业**：标准的开发流程  
✅ **版本控制**：可以回滚到任何版本  
✅ **团队协作**：多人可以同时开发  
✅ **CI/CD**：可以自动化部署  
✅ **安全**：不会上传 node_modules 等无用文件  

---

## 📋 准备工作

### 1. 创建 .gitignore（已有）

检查项目根目录是否有 `.gitignore`：

```bash
# 查看
cat /Users/feng/Documents/Ton/.gitignore
```

如果没有或不完整，我已经帮你创建了。

### 2. 选择 Git 托管平台

- **GitHub**（推荐，免费私有仓库）
- **GitLab**（也不错）
- **Gitee**（国内，速度快）
- **自建 Git 服务器**（如果需要）

---

## 🎯 部署流程（使用 Git）

### 方式 1：使用 GitHub（推荐）

#### **步骤 1：创建 GitHub 仓库**

1. 访问 https://github.com/new
2. 仓库名：`ton-dice-game`
3. 选择 **Private**（私有仓库）
4. 不要初始化 README、.gitignore（本地已有）
5. 点击 Create repository

#### **步骤 2：推送代码到 GitHub**

在本地运行：

```bash
cd /Users/feng/Documents/Ton

# 初始化 git（如果还没初始化）
git init

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/ton-dice-game.git

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: TON Dice Game V2"

# 推送到 GitHub
git push -u origin main
```

如果推送失败（main/master 分支问题）：
```bash
git branch -M main
git push -u origin main
```

#### **步骤 3：在服务器上克隆代码**

SSH 登录服务器后：

```bash
# 安装 Git（如果没有）
apt update
apt install -y git

# 克隆项目
cd /var/www
git clone https://github.com/YOUR_USERNAME/ton-dice-game.git ton-dice
cd ton-dice

# 运行部署脚本
cd deploy
chmod +x deploy.sh
./deploy.sh
```

#### **步骤 4：后续更新（最简单）**

本地开发完成后：

```bash
# 提交更改
git add .
git commit -m "Update: 描述你的修改"
git push
```

服务器上更新：

```bash
ssh root@YOUR_SERVER_IP
cd /var/www/ton-dice
git pull
pm2 restart all
```

---

### 方式 2：使用 Gitee（国内，速度快）

#### **步骤 1：创建 Gitee 仓库**

1. 访问 https://gitee.com/projects/new
2. 仓库名：`ton-dice-game`
3. 选择私有
4. 点击创建

#### **步骤 2：推送代码**

```bash
cd /Users/feng/Documents/Ton
git init
git remote add origin https://gitee.com/YOUR_USERNAME/ton-dice-game.git
git add .
git commit -m "Initial commit"
git push -u origin master
```

#### **步骤 3：服务器克隆**

```bash
cd /var/www
git clone https://gitee.com/YOUR_USERNAME/ton-dice-game.git ton-dice
cd ton-dice/deploy
./deploy.sh
```

---

### 方式 3：使用 SSH Key（免密码，更安全）

#### **步骤 1：生成 SSH Key**

在本地：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
```

在服务器：
```bash
ssh-keygen -t ed25519 -C "server@yourdomain.com"
cat ~/.ssh/id_ed25519.pub
```

#### **步骤 2：添加到 GitHub**

1. 访问 https://github.com/settings/keys
2. 点击 "New SSH key"
3. 粘贴公钥内容
4. 保存

#### **步骤 3：使用 SSH URL**

```bash
# 本地
git remote set-url origin git@github.com:YOUR_USERNAME/ton-dice-game.git

# 服务器
git clone git@github.com:YOUR_USERNAME/ton-dice-game.git
```

---

## 🔄 自动化部署脚本（使用 Git）

我帮你创建了一个自动化脚本：`deploy/deploy-with-git.sh`

**功能：**
- ✅ 自动从 Git 拉取最新代码
- ✅ 自动安装依赖
- ✅ 自动构建
- ✅ 自动重启服务

**使用方法：**

```bash
# 首次部署
ssh root@YOUR_SERVER_IP
bash <(curl -s https://raw.githubusercontent.com/YOUR_REPO/main/deploy/deploy-with-git.sh)

# 后续更新
ssh root@YOUR_SERVER_IP
cd /var/www/ton-dice
git pull && ./deploy/update.sh
```

---

## 📦 .gitignore 配置

确保这些文件不会被提交到 Git：

```gitignore
# 依赖
node_modules/
.pnp/
.pnp.js

# 构建产物
dist/
build/
.next/
out/

# 环境变量（重要！）
.env
.env.local
.env.*.local

# 日志
*.log
npm-debug.log*
logs/

# 操作系统
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# 临时文件
*.tmp
.cache/
```

---

## ⚠️ 安全提醒

### **永远不要提交：**

❌ `.env` 文件（包含密码、密钥）  
❌ `node_modules/`（体积大）  
❌ 私钥文件  
❌ 数据库备份  

### **如果不小心提交了敏感信息：**

```bash
# 删除敏感文件的历史记录
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 强制推送（谨慎！）
git push origin --force --all
```

---

## 🎯 推荐的工作流程

### **开发阶段**

```bash
# 1. 本地开发
cd /Users/feng/Documents/Ton
# ... 修改代码 ...

# 2. 本地测试
npm run dev

# 3. 提交代码
git add .
git commit -m "feat: 添加新功能"
git push
```

### **部署阶段**

```bash
# 1. SSH 登录服务器
ssh root@YOUR_SERVER_IP

# 2. 拉取最新代码
cd /var/www/ton-dice
git pull

# 3. 安装依赖（如果有新依赖）
cd backend && npm install
cd ../frontend && npm install

# 4. 构建前端
cd frontend && npm run build

# 5. 重启服务
pm2 restart all
```

---

## 🚀 对比：Git vs 直接上传

| 特性 | Git 方式 | rsync 直接上传 |
|------|----------|---------------|
| 版本控制 | ✅ 有 | ❌ 无 |
| 回滚 | ✅ 简单 | ❌ 困难 |
| 团队协作 | ✅ 方便 | ❌ 不便 |
| 速度 | ✅ 快（只传输差异） | ❌ 慢（传输所有） |
| 安全性 | ✅ 高（不传敏感文件） | ⚠️ 需小心 |
| 学习成本 | ⚠️ 稍高 | ✅ 简单 |

---

## 💡 我的建议

### **现在（测试阶段）：**

1. 使用 **GitHub 私有仓库**
2. 推送代码
3. 服务器克隆并部署

### **生产环境（上线后）：**

1. 设置 **GitHub Actions** 自动部署（CI/CD）
2. 代码审查流程（Pull Request）
3. 自动化测试

---

**准备好了吗？我帮你创建完整的 Git 部署脚本！**
