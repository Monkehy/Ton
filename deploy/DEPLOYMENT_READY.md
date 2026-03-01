# 🎉 部署文件已准备完成！

## 📦 创建的部署文件

```
/Users/feng/Documents/Ton/
├── deploy/
│   ├── README.md           # 部署总指南
│   ├── QUICKSTART.md       # 快速开始指南
│   ├── deploy.sh           # 自动化部署脚本 ✨
│   └── update.sh           # 快速更新脚本
├── docker-compose.yml      # Docker 编排配置
└── backend/
    └── Dockerfile          # 后端容器配置
```

---

## 🚀 现在可以开始部署了！

### 方式 1：自动化部署（推荐）

**步骤 1：准备服务器**

确保你有：
- ✅ 服务器 IP
- ✅ SSH 登录权限（root 或 sudo 用户）
- ✅ 域名已配置 DNS 指向服务器

**步骤 2：上传项目到服务器**

在本地运行（替换你的服务器 IP）：

```bash
# 确保在项目根目录
cd /Users/feng/Documents/Ton

# 上传项目
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ root@YOUR_SERVER_IP:/var/www/ton-dice/
```

**步骤 3：SSH 登录并运行部署脚本**

```bash
# SSH 登录
ssh root@YOUR_SERVER_IP

# 进入项目目录
cd /var/www/ton-dice/deploy

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

脚本会提示你输入：
- 服务器 IP
- 域名
- 数据库密码（可选，留空自动生成）

然后自动完成：
1. 安装 Node.js、PostgreSQL、Nginx、Certbot
2. 配置数据库
3. 安装项目依赖
4. 构建前端
5. 配置 Nginx + HTTPS
6. 启动服务

**预计耗时：5-10 分钟**

---

### 方式 2：Docker 部署

```bash
# 1. 上传项目
rsync -avz ./ root@YOUR_SERVER_IP:/var/www/ton-dice/

# 2. SSH 登录
ssh root@YOUR_SERVER_IP

# 3. 安装 Docker（如果未安装）
curl -fsSL https://get.docker.com | sh

# 4. 启动服务
cd /var/www/ton-dice
export DB_PASSWORD="your-secure-password"
docker-compose up -d

# 5. 查看状态
docker-compose ps
docker-compose logs -f
```

---

## ✅ 部署后验证

### 1. 检查服务状态

```bash
# PM2 部署
pm2 status

# Docker 部署
docker-compose ps
```

### 2. 测试网站

浏览器访问：
- 前端：`https://your-domain.com`
- API：`https://your-domain.com/api/health`

### 3. 检查 HTTPS

确保浏览器显示 🔒 锁图标

---

## 🔄 日常运维

### 更新代码

修改 `deploy/update.sh` 中的服务器 IP 和用户名，然后运行：

```bash
cd /Users/feng/Documents/Ton
./deploy/update.sh
```

### 查看日志

```bash
# PM2 部署
pm2 logs ton-backend

# Docker 部署
docker-compose logs -f backend
```

### 重启服务

```bash
# PM2 部署
pm2 restart all

# Docker 部署
docker-compose restart
```

---

## 📋 部署检查清单

部署前：
- [ ] 服务器已购买并可 SSH 访问
- [ ] 域名已购买并配置 DNS
- [ ] 本地项目测试正常
- [ ] 合约已部署到 Testnet

部署中：
- [ ] 上传项目到服务器
- [ ] 运行部署脚本
- [ ] 输入配置信息

部署后：
- [ ] 访问网站正常
- [ ] HTTPS 证书有效
- [ ] API 响应正常
- [ ] 数据库连接正常

---

## 🆘 遇到问题？

查看详细文档：
- `deploy/README.md` - 完整部署指南
- `deploy/QUICKSTART.md` - 快速开始和故障排查

常见问题：
1. **无法访问网站** → 检查防火墙和 DNS
2. **502 错误** → 检查后端服务状态
3. **HTTPS 证书失败** → 确认域名 DNS 已生效

---

## 🎯 下一步

部署完成后：

1. **在 Telegram 创建 Mini App**
   - 联系 @BotFather
   - 创建 Mini App
   - 配置 URL 为你的域名

2. **测试完整流程**
   - 连接 TON Connect
   - 充值测试
   - 游戏测试
   - 提现测试

3. **监控和优化**
   - 配置日志监控
   - 性能优化
   - 备份策略

---

**准备好了就开始部署吧！** 🚀

有任何问题随时问我！
