# 🚀 一键启动前后端开发服务器

## 方法 1：使用 npm 脚本（推荐）

### 快速启动
```bash
npm run dev
```

这会同时启动：
- **后端服务**：http://localhost:3000（蓝色标签）
- **前端服务**：http://localhost:5173（紫色标签）

### 停止服务
按 `Ctrl + C` 一次即可停止所有服务。

### 优点
- ✅ 跨平台（Windows/Mac/Linux 都支持）
- ✅ 彩色输出，易于区分前后端日志
- ✅ 一键停止所有服务
- ✅ 自动处理进程管理

---

## 方法 2：使用 Bash 脚本（仅 Mac/Linux）

### 快速启动
```bash
./start-dev.sh
```

或

```bash
bash start-dev.sh
```

### 停止服务
按 `Ctrl + C` 一次即可停止所有服务。

### 优点
- ✅ 显示启动状态和 PID
- ✅ 自动检查并安装依赖
- ✅ 美观的彩色输出
- ✅ 统一的停止机制

---

## 方法 3：手动分别启动

### 启动后端
```bash
cd backend
npm run dev
```

### 启动前端（新终端）
```bash
cd frontend
npm run dev
```

---

## 📋 首次运行前的准备

### 1. 确保已安装依赖

**根目录安装**（如果使用 workspaces）：
```bash
npm install
```

**或分别安装**：
```bash
# 后端依赖
cd backend && npm install && cd ..

# 前端依赖
cd frontend && npm install && cd ..
```

### 2. 配置环境变量

**后端 `.env`**：
```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env 配置数据库等
```

**前端 `.env`**：
```bash
cp frontend/.env.example frontend/.env
# 编辑 frontend/.env 配置合约地址等
```

### 3. 初始化数据库（仅后端需要）
```bash
# 后端会在启动时自动运行迁移
# 确保 PostgreSQL 正在运行
```

---

## 🔍 日志查看

### 使用 npm run dev（方法 1）
输出会自动标记来源：
```
[backend]  Server listening on port 3000
[frontend] Local: http://localhost:5173
```

### 使用 start-dev.sh（方法 2）
会显示启动状态和进程 ID：
```
📦 启动后端服务...
   ✓ 后端已启动 (PID: 12345)
🎨 启动前端服务...
   ✓ 前端已启动 (PID: 12346)
```

---

## ⚠️ 常见问题

### Q1: 端口已被占用
**错误**：`Error: listen EADDRINUSE: address already in use :::3000`

**解决**：
```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :5173

# 杀死进程
kill -9 <PID>
```

### Q2: 依赖未安装
**错误**：`Cannot find module 'xxx'`

**解决**：
```bash
# 根目录安装所有依赖
npm install

# 或分别安装
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Q3: 数据库连接失败
**错误**：`Connection to database failed`

**解决**：
1. 确保 PostgreSQL 正在运行
2. 检查 `backend/.env` 中的数据库配置
3. 尝试手动连接数据库测试

### Q4: 前端访问不到后端 API
**解决**：
1. 确认后端已启动在 `http://localhost:3000`
2. 检查前端 `vite.config.ts` 中的 proxy 配置
3. 检查浏览器控制台的 CORS 错误

---

## 🛠️ 开发命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端 |
| `npm run dev:backend` | 只启动后端 |
| `npm run dev:frontend` | 只启动前端 |
| `npm run build` | 构建所有项目 |
| `npm run build:contracts` | 只构建合约 |

---

## 📦 项目结构

```
/Users/feng/Documents/Ton/
├── backend/          # 后端服务（Node.js + Fastify）
├── frontend/         # 前端服务（React + Vite）
├── contracts/        # 智能合约（Tact）
├── start-dev.sh      # Bash 启动脚本
└── package.json      # 根配置（workspaces）
```

---

## 🎯 推荐工作流

### 日常开发
```bash
# 1. 启动开发服务器
npm run dev

# 2. 前端在浏览器自动打开
# http://localhost:5173

# 3. 后端 API
# http://localhost:3000

# 4. 修改代码，热重载会自动生效

# 5. 完成后 Ctrl+C 停止
```

### 测试合约更新
```bash
# 1. 编译合约
npm run build:contracts

# 2. 部署到测试网
cd contracts
npx blueprint run deployAll --testnet

# 3. 更新前后端 .env 中的合约地址

# 4. 重启前后端
npm run dev
```

---

## ✅ 验证服务启动成功

访问以下 URL 确认：

- ✅ 前端：http://localhost:5173
- ✅ 后端健康检查：http://localhost:3000/health
- ✅ 后端 API：http://localhost:3000/api/user/status

如果所有 URL 都能访问，说明启动成功！🎉

---

## 💡 小贴士

1. **推荐使用方法 1**（`npm run dev`）：跨平台，输出清晰
2. **开发时保持终端可见**：方便查看实时日志
3. **遇到问题先查看日志**：大部分问题都能从日志中找到原因
4. **使用 VS Code**：可以在集成终端中运行，更方便

---

祝开发愉快！🚀
