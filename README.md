# 🎲 TON Dice Game V2

基于 TON 区块链的去中心化骰子游戏，采用多层安全架构设计。

## 📋 项目特点

- ✅ **安全架构**：多签冷钱包 + 热钱包分离
- ✅ **公平透明**：链上随机数，结果可验证
- ✅ **即时返佣**：1% 推荐奖励 + 0.5% 失败返还
- ✅ **Telegram Mini App**：无缝集成 TON 钱包
- ✅ **Shadow Frontend**：IP 过滤和合规路由

## 🏗️ 技术栈

### 合约层
- **Tact** - TON 智能合约语言
- **TON Blueprint** - 合约开发框架

### 前端
- **React + Vite** - 现代化构建工具
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **@tonconnect/ui-react** - TON 钱包连接
- **@twa-dev/sdk** - Telegram Mini App SDK

### 后端
- **Node.js + TypeScript** - 运行时
- **Fastify** - 高性能 Web 框架
- **PostgreSQL** - 数据库
- **@ton/ton** - TON SDK

## 📦 项目结构

```
Ton/
├── contracts/          # 智能合约
│   ├── MultiSigColdWallet.tact
│   ├── PrizePool.tact
│   ├── DepositVault.tact
│   └── DiceGameV2.tact
├── frontend/           # 前端应用
├── backend/            # 后端 API
├── deploy/             # 部署脚本
├── .gitignore          # Git 忽略配置
├── check-security.sh   # 安全检查脚本
└── SECURITY_GUIDE.md   # 安全指南
```

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/ton-dice-game.git
cd ton-dice-game
```

### 2. 配置环境变量

#### 后端配置
```bash
cd backend
cp .env.example .env
nano .env
```

修改以下内容：
- `DATABASE_URL` - 数据库连接
- `JWT_SECRET` - JWT 密钥
- `TON_*_ADDRESS` - 合约地址

#### 前端配置
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

### 3. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install

# 合约
cd contracts
npm install
```

### 4. 本地开发

```bash
# 启动后端（在 backend 目录）
npm run dev

# 启动前端（在 frontend 目录）
npm run dev

# 编译合约（在 contracts 目录）
npm run build
```

### 5. 部署合约

详见 [contracts/DIRECT_DEPLOY_GUIDE.md](contracts/DIRECT_DEPLOY_GUIDE.md)

```bash
cd contracts
npm run deploy:testnet
```

### 6. 部署到服务器

详见 [deploy/GIT_QUICKSTART.md](deploy/GIT_QUICKSTART.md)

```bash
# 修改配置
nano deploy/deploy-with-git.sh

# 在服务器上运行
bash <(curl -s https://raw.githubusercontent.com/YOUR_REPO/main/deploy/deploy-with-git.sh)
```

## 🔐 安全最佳实践

### ⚠️ 推送代码前必读

**永远不要提交这些文件：**

- ❌ `.env` 文件（包含密码和密钥）
- ❌ `deployment-*.json` 文件（包含合约地址）
- ❌ 私钥和助记词文件
- ❌ 数据库备份文件

### 运行安全检查

每次推送前运行：

```bash
./check-security.sh
```

如果检查通过，才能推送：

```bash
git add .
git commit -m "Your commit message"
git push
```

**详细安全指南**：[SECURITY_GUIDE.md](SECURITY_GUIDE.md)

## 📚 文档

- [合约部署指南](contracts/DIRECT_DEPLOY_GUIDE.md)
- [服务器部署指南](deploy/GIT_QUICKSTART.md)
- [安全配置指南](SECURITY_GUIDE.md)
- [网络配置说明](deploy/NETWORK_CONFIG.md)
- [部署成功记录](DEPLOYMENT_SUCCESS.md)

## 🎮 游戏规则

### 投注选项

| 选择面数 | 赔率 | 中奖概率 |
|---------|------|---------|
| 1 个面 | 5.0x | 16.67% |
| 2 个面 | 2.8475x | 33.33% |
| 3 个面 | 1.9x | 50% |
| 4 个面 | 1.4263x | 66.67% |
| 5 个面 | 1.142x | 83.33% |

### 费用说明

- **平台抽成**：2%（House Edge）
- **推荐奖励**：1%（给推荐人）
- **失败返还**：0.5%（Lucky Rebate）

### 资金流转

```
玩家充值 → DepositVault（热钱包）
    ↓
游戏下注 → DiceGameV2（游戏逻辑）
    ↓
中奖 → PrizePool（奖池）→ 玩家
    ↓
平台收益 → MultiSigColdWallet（冷钱包）
```

## 🔗 已部署的合约（Testnet）

- **DiceGameV2**: `EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut`
- **DepositVault**: `EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P`
- **PrizePool**: `EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS`
- **MultiSigColdWallet**: `kQD_18_1r54BdkGo40ajmhKpWCqDRUSrAqtV1yZSLEzC2Jha`

浏览器查看：[TON Testnet Explorer](https://testnet.tonscan.org)

## 🛠️ 开发命令

### 后端

```bash
npm run dev        # 开发模式
npm run build      # 构建
npm run start      # 生产模式
npm run test       # 测试
```

### 前端

```bash
npm run dev        # 开发服务器
npm run build      # 构建生产版本
npm run preview    # 预览构建结果
```

### 合约

```bash
npm run build             # 编译合约
npm run deploy:testnet    # 部署到测试网
npm run deploy:mainnet    # 部署到主网
npm run deploy:direct     # 使用助记词直接部署
npm run check:config      # 检查配置
```

## 🧪 测试

### 后端测试

```bash
cd backend
npm run test
```

### 前端测试

```bash
cd frontend
npm run test
```

### 合约测试

```bash
cd contracts
npm run test
```

## 📊 监控和日志

### 查看服务状态

```bash
pm2 status
pm2 logs ton-dice-backend
```

### 查看 Nginx 日志

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 数据库查询

```bash
sudo -u postgres psql ton_dice_db
```

## 🔄 更新部署

### 本地修改后：

```bash
git add .
git commit -m "描述你的修改"
git push
```

### 服务器更新：

```bash
ssh root@YOUR_SERVER_IP
cd /var/www/ton-dice
git pull
cd frontend && npm run build
pm2 restart all
```

## 🌐 环境

- **Testnet**：用于开发和测试
- **Mainnet**：生产环境

切换网络：详见 [deploy/NETWORK_CONFIG.md](deploy/NETWORK_CONFIG.md)

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送到分支：`git push origin feature/your-feature`
5. 提交 Pull Request

**注意**：提交前请运行 `./check-security.sh` 确保没有敏感信息泄露！

## 📄 许可证

本项目仅供学习和研究使用。

## ⚠️ 免责声明

本项目是一个技术演示项目。在某些司法管辖区，线上博彩可能受到法律限制。使用本项目前，请确保遵守当地法律法规。

## 📞 联系方式

- **GitHub Issues**: 技术问题和 Bug 报告
- **安全问题**: 请私下联系维护者，不要公开披露

## 🙏 致谢

- [TON Foundation](https://ton.org)
- [Tact Language](https://tact-lang.org)
- [TON Connect](https://github.com/ton-connect)

---

**⚡ 用 TON 构建，由社区驱动！**
