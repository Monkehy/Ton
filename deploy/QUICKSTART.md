# 🚀 快速部署指南

## 📋 部署前准备

### 1. 服务器信息

- [ ] 服务器 IP：`_________________`
- [ ] SSH 登录方式：密码 / 密钥
- [ ] 域名：`_________________`
- [ ] 域名 DNS 已配置指向服务器 IP

### 2. 本地准备

确保项目已经：
- [x] 合约已部署到 Testnet
- [x] 前端配置已更新
- [x] 后端配置已更新
- [ ] 测试本地运行正常

---

## 🎯 三种部署方式

### 方式 1：一键自动部署（推荐新手）

**适合：第一次部署，服务器是全新的**

```bash
# 1. SSH 连接到服务器
ssh root@your-server-ip

# 2. 下载部署脚本
wget https://raw.githubusercontent.com/YOUR_REPO/deploy/deploy.sh
chmod +x deploy.sh

# 3. 运行部署
./deploy.sh
```

按提示输入域名和配置信息，脚本会自动完成所有配置。

---

### 方式 2：半自动部署（推荐）

**适合：想要更多控制权**

#### 步骤 1：上传项目到服务器

在本地运行：

```bash
# 确保在项目根目录
cd /Users/feng/Documents/Ton

# 上传项目（替换 your-server-ip）
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ root@your-server-ip:/var/www/ton-dice/
```

#### 步骤 2：SSH 登录服务器

```bash
ssh root@your-server-ip
```

#### 步骤 3：运行部署脚本

```bash
cd /var/www/ton-dice/deploy
chmod +x deploy.sh
./deploy.sh
```

---

### 方式 3：Docker 部署（推荐生产环境）

**适合：想要容器化部署**

```bash
# 1. SSH 到服务器
ssh root@your-server-ip

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sh

# 3. 上传项目
cd /Users/feng/Documents/Ton
rsync -avz ./ root@your-server-ip:/var/www/ton-dice/

# 4. 启动服务
ssh root@your-server-ip
cd /var/www/ton-dice
docker-compose up -d
```

---

## ✅ 部署后验证

### 1. 检查服务状态

```bash
pm2 status
```

应该看到：
```
┌─────┬──────────────┬─────────┬─────────┐
│ id  │ name         │ status  │ restart │
├─────┼──────────────┼─────────┼─────────┤
│ 0   │ ton-backend  │ online  │ 0       │
└─────┴──────────────┴─────────┴─────────┘
```

### 2. 检查 Nginx

```bash
systemctl status nginx
```

应该显示 `active (running)`

### 3. 测试网站

在浏览器访问：
- 前端：`https://your-domain.com`
- API：`https://your-domain.com/api/health`

### 4. 检查 HTTPS

确保浏览器地址栏显示 🔒 锁图标

---

## 🔄 日常运维

### 更新代码

```bash
cd /Users/feng/Documents/Ton
./deploy/update.sh
```

### 查看日志

```bash
# 后端日志
pm2 logs ton-backend

# Nginx 日志
tail -f /var/log/nginx/ton-dice-access.log
tail -f /var/log/nginx/ton-dice-error.log
```

### 重启服务

```bash
# 重启应用
pm2 restart all

# 重启 Nginx
systemctl restart nginx
```

### 备份数据库

```bash
# 导出数据库
pg_dump -U ton_user ton_tma_v1 > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U ton_user ton_tma_v1 < backup_20260227.sql
```

---

## 🐛 故障排查

### 问题 1：网站无法访问

```bash
# 检查 Nginx 状态
systemctl status nginx

# 检查端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log
```

### 问题 2：API 返回 502

```bash
# 检查后端服务
pm2 status
pm2 logs ton-backend

# 重启后端
pm2 restart ton-backend
```

### 问题 3：数据库连接失败

```bash
# 检查 PostgreSQL
systemctl status postgresql

# 测试数据库连接
psql -U ton_user -d ton_tma_v1 -h localhost

# 查看连接配置
cat /var/www/ton-dice/backend/.env | grep DATABASE_URL
```

### 问题 4：HTTPS 证书过期

```bash
# 手动更新证书
certbot renew

# 查看证书状态
certbot certificates
```

---

## 📊 监控建议

### 1. 安装监控工具

```bash
# 安装 htop（系统监控）
apt install htop

# 使用 PM2 监控
pm2 monit
```

### 2. 配置告警

```bash
# PM2 自动重启（已内置）
pm2 startup
pm2 save
```

### 3. 日志管理

```bash
# 配置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔐 安全建议

1. **修改 SSH 端口**
```bash
# 编辑 SSH 配置
vi /etc/ssh/sshd_config
# 修改 Port 22 为其他端口（如 2222）
systemctl restart sshd
```

2. **禁用 root 登录**
```bash
# 创建新用户
adduser deploy
usermod -aG sudo deploy

# 禁用 root SSH 登录
vi /etc/ssh/sshd_config
# 设置 PermitRootLogin no
```

3. **配置 Fail2Ban**
```bash
apt install fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📞 需要帮助？

遇到问题请提供：
1. 错误信息 / 日志输出
2. 服务器系统信息（`uname -a`）
3. 部署步骤截图

我会帮你解决！
