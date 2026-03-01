# 🎉 独立部署脚本已创建完成！

## 📦 创建的文件

1. **`scripts/deployDirect.ts`** - 核心部署脚本（独立，不依赖 Blueprint 钱包选择）
2. **`scripts/checkConfig.ts`** - 配置检查脚本
3. **`deploy.sh`** - 快速部署 Shell 脚本
4. **`DIRECT_DEPLOY_GUIDE.md`** - 完整使用指南
5. **`blueprint.config.ts`** - Blueprint testnet 配置

---

## 🚀 快速开始

### 第一步：检查配置

```bash
cd /Users/feng/Documents/Ton/contracts
npm run check:config
```

这会检查你的多签地址配置是否正确。

---

### 第二步：更新多签地址（如果需要）

编辑 `scripts/deployDirect.ts`：

```typescript
// Testnet 配置（第 37-42 行）
const TESTNET_CONFIG = {
  multiSigSigners: [
    "0Q...", // ← 替换为你的真实 testnet 地址
    "0Q...", 
    "0Q...",
  ],
  initialPrizePoolAmount: "100",
  // ...
};
```

---

### 第三步：部署到 Testnet

#### 方法 A：使用快速脚本（推荐）

```bash
cd /Users/feng/Documents/Ton/contracts
./deploy.sh testnet
```

#### 方法 B：直接使用 npm 命令

```bash
cd /Users/feng/Documents/Ton/contracts
NETWORK=testnet npm run deploy:direct
```

脚本会提示你输入 24 个助记词。

---

## 📋 完整流程示例

```bash
# 1. 进入合约目录
cd /Users/feng/Documents/Ton/contracts

# 2. 检查配置
npm run check:config

# 3. 如果有问题，编辑配置
code scripts/deployDirect.ts  # 或用其他编辑器

# 4. 再次检查配置
npm run check:config

# 5. 部署到 testnet（会提示输入助记词）
NETWORK=testnet npm run deploy:direct

# 6. 查看部署结果
cat ../deployment-testnet.json

# 7. 验证合约（复制地址到浏览器）
# https://testnet.tonscan.org/address/<你的合约地址>
```

---

## ✅ 优势

相比 Blueprint 的钱包选择器，这个独立脚本有以下优势：

1. ✅ **网络准确** - 直接连接到正确的 testnet/mainnet RPC
2. ✅ **无钱包兼容问题** - 不依赖 Tonhub/Tonkeeper 的网络切换
3. ✅ **更好的控制** - 可以看到每一步的详细进度
4. ✅ **自动重试** - 网络超时会自动重试
5. ✅ **保存完整记录** - 自动生成 `deployment-*.json` 文件

---

## 📝 注意事项

### 🔐 安全
- **永远不要**在命令行中暴露助记词（使用交互式输入）
- 部署后清理终端历史：`history -c`
- 使用专门的部署钱包，不要用主钱包

### 💰 余额要求

| 网络 | 最低余额 |
|------|---------|
| Testnet | 120 TON（测试币） |
| Mainnet | 1020 TON（真实 TON） |

### 🌐 网络地址格式

| 网络 | 地址前缀 | 示例 |
|------|---------|------|
| Testnet | `0Q` 或 `kQ` | `0QAbc123...` |
| Mainnet | `UQ` 或 `EQ` | `EQAbc123...` |

---

## 🔧 命令速查表

```bash
# 配置检查
npm run check:config

# 编译合约
npm run build

# 部署到 testnet（交互式）
NETWORK=testnet npm run deploy:direct

# 部署到 mainnet（交互式）
NETWORK=mainnet npm run deploy:direct

# 快速部署（使用脚本）
./deploy.sh testnet
./deploy.sh mainnet

# 查看部署结果
cat ../deployment-testnet.json
cat ../deployment-mainnet.json
```

---

## 📖 详细文档

查看完整指南：
```bash
cat DIRECT_DEPLOY_GUIDE.md
```

---

## ❓ 常见问题

### Q: 我没有 testnet 地址怎么办？
**A:** 
1. 使用 Tonkeeper APP
2. 开启开发者模式
3. 切换到 Testnet
4. 创建 3 个测试钱包
5. 去 [@testgiver_ton_bot](https://t.me/testgiver_ton_bot) 领取测试币

### Q: 助记词在哪里找？
**A:** 在你的钱包 APP（Tonkeeper/Tonhub）的设置中查看。
**⚠️ 注意：只使用测试钱包的助记词，不要用主钱包！**

### Q: 部署超时怎么办？
**A:** 访问脚本显示的浏览器链接，检查合约是否已部署成功。如果已成功，可以继续；如果失败，重新运行脚本。

### Q: 可以先在 testnet 测试吗？
**A:** 强烈建议！先在 testnet 完整测试所有功能后，再部署到 mainnet。

---

## 🎯 下一步

部署成功后：

1. ✅ 更新前端 `.env` 配置
2. ✅ 更新后端 `.env` 配置  
3. ✅ 测试充值功能
4. ✅ 测试游戏流程
5. ✅ 测试提现功能
6. ✅ 如果 testnet 测试通过，部署到 mainnet

---

## 🆘 需要帮助？

准备好以下信息：
- 使用的网络（testnet/mainnet）
- 错误信息截图
- 钱包余额
- 部署日志

祝你部署顺利！🚀
