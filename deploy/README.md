# TON Dice Game - 服务器部署指南

## 📋 服务器要求

- **操作系统**: Ubuntu 20.04+ / Debian 11+
- **内存**: 至少 2GB RAM
- **CPU**: 1 核心以上
- **存储**: 20GB 以上
- **端口**: 80 (HTTP)、443 (HTTPS)、3001 (API)

---

## 🔧 准备工作

### 1. 服务器信息

请准备以下信息：
- 服务器 IP 地址：`_______________`
- SSH 用户名：`_______________` (通常是 `root` 或 `ubuntu`)
- SSH 密码或密钥路径
- 域名（已配置 DNS 指向服务器 IP）：`_______________`

### 2. 域名配置

在你的域名提供商（如阿里云、腾讯云、Cloudflare）添加 DNS 记录：

```
类型: A
主机记录: @
记录值: 你的服务器IP
TTL: 600
```

如果要用子域名（如 `dice.yourdomain.com`）：
```
类型: A
主机记录: dice
记录值: 你的服务器IP
TTL: 600
```

---

## 🚀 部署步骤

### 方式 1: 自动化部署脚本（推荐）

我已经创建了自动化脚本，只需运行：

```bash
cd /Users/feng/Documents/Ton
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

脚本会自动：
1. 安装所有依赖（Node.js、PostgreSQL、Nginx、Certbot）
2. 配置数据库
3. 构建前后端项目
4. 配置 Nginx + HTTPS
5. 启动服务

### 方式 2: 手动部署

如果需要手动部署，请查看 `deploy/MANUAL_DEPLOY.md`

---

## 📦 部署后验证

1. **检查服务状态**
```bash
ssh user@your-server-ip
pm2 status
```

2. **查看日志**
```bash
pm2 logs backend
pm2 logs frontend
```

3. **访问网站**
- 前端：`https://yourdomain.com`
- API：`https://yourdomain.com/api`

---

## 🔄 更新部署

当代码有更新时，运行：

```bash
./deploy/update.sh
```

---

## 🆘 故障排查

### 服务无法启动
```bash
# 检查日志
pm2 logs

# 重启服务
pm2 restart all
```

### HTTPS 证书问题
```bash
# 手动更新证书
sudo certbot renew
sudo systemctl reload nginx
```

### 数据库连接失败
```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 重启数据库
sudo systemctl restart postgresql
```

---

## 📞 需要帮助？

部署过程中遇到任何问题，请提供：
1. 错误信息截图
2. 日志输出（`pm2 logs`）
3. 服务器系统信息（`uname -a`）
