# 一键部署指南

## 需要部署的合约数量

**4 个合约**，按以下顺序自动部署：

1. **MultiSigColdWallet** - 多签冷钱包（存储 90% 充值）
2. **PrizePool** - 奖池合约（支付奖金和返水）
3. **DepositVault** - 充值热钱包（管理用户余额，10/90 分流）
4. **DiceGameV2** - 游戏合约（纯游戏逻辑）

---

## 一键部署步骤

### 第 1 步：配置管理员地址

编辑 `contracts/scripts/deployAll.ts`，修改第 19-25 行：

```typescript
const MULTISIG_SIGNERS = [
  "EQA...", // 替换为 Signer 1 的真实地址
  "EQB...", // 替换为 Signer 2 的真实地址
  "EQC...", // 替换为 Signer 3 的真实地址
  "EQD...", // 替换为 Signer 4 的真实地址
  "EQE...", // 替换为 Signer 5 的真实地址
];
```

**注意：** 这 5 个地址是冷钱包的多签管理员，需要至少 3 个签名才能从冷钱包转账。

---

### 第 2 步：编译所有合约

```bash
cd contracts

# 编译所有 4 个合约
npx blueprint build DepositVault
npx blueprint build PrizePool
npx blueprint build MultiSigColdWallet
npx blueprint build DiceGameV2
```

预计编译时间：**1-2 分钟**

---

### 第 3 步：一键部署（testnet）

```bash
# 先在测试网部署
npx blueprint run deployAll --testnet
```

**部署过程：**
```
🚀 Starting V2 architecture deployment...
Owner address: EQxxx...

📦 [1/4] Deploying MultiSigColdWallet...
✅ MultiSigColdWallet deployed: EQabc...

📦 [2/4] Deploying PrizePool...
✅ PrizePool deployed: EQdef...
💰 Funding prize pool with 1000 TON...
✅ Prize pool funded

📦 [3/4] Deploying DepositVault...
✅ DepositVault deployed: EQghi...

📦 [4/4] Deploying DiceGameV2...
✅ DiceGameV2 deployed: EQjkl...

🔗 [5/5] Updating contract associations...
   ✅ PrizePool updated
   ⚠️  DepositVault gameContract set during init

🎉 V2 Architecture Deployment Complete!
```

预计部署时间：**3-5 分钟**（包括等待区块确认）

---

### 第 4 步：查看部署结果

部署完成后会自动生成两个文件：

#### `contracts/deployment-v2.json`
```json
{
  "network": "testnet",
  "timestamp": "2026-02-26T...",
  "deployer": "EQxxx...",
  "contracts": {
    "multiSigColdWallet": "EQabc...",
    "prizePool": "EQdef...",
    "depositVault": "EQghi...",
    "diceGameV2": "EQjkl..."
  }
}
```

#### `contracts/deployment-v2.env`
```bash
# 前端环境变量
VITE_DEPOSIT_VAULT_ADDRESS=EQghi...
VITE_PRIZE_POOL_ADDRESS=EQdef...
VITE_DICE_GAME_V2_ADDRESS=EQjkl...
VITE_COLD_WALLET_ADDRESS=EQabc...

# 后端环境变量
DEPOSIT_VAULT_ADDRESS=EQghi...
PRIZE_POOL_ADDRESS=EQdef...
DICE_GAME_V2_ADDRESS=EQjkl...
COLD_WALLET_ADDRESS=EQabc...
```

**直接复制这些变量到你的 `.env` 文件！**

---

### 第 5 步：更新前后端配置

#### 前端 (`frontend/.env`)
```bash
# 复制 deployment-v2.env 中的 VITE_ 开头的变量
VITE_DEPOSIT_VAULT_ADDRESS=EQghi...
VITE_PRIZE_POOL_ADDRESS=EQdef...
VITE_DICE_GAME_V2_ADDRESS=EQjkl...
VITE_COLD_WALLET_ADDRESS=EQabc...
```

#### 后端 (`backend/.env`)
```bash
# 复制 deployment-v2.env 中不带 VITE_ 的变量
DEPOSIT_VAULT_ADDRESS=EQghi...
PRIZE_POOL_ADDRESS=EQdef...
DICE_GAME_V2_ADDRESS=EQjkl...
COLD_WALLET_ADDRESS=EQabc...
```

---

### 第 6 步：mainnet 部署（测试通过后）

```bash
# 确认测试网功能正常后，部署到主网
npx blueprint run deployAll --mainnet
```

⚠️ **重要：mainnet 部署前确保**
- [ ] testnet 已完整测试（充值、游戏、提现流程）
- [ ] 5 个多签管理员私钥已离线备份
- [ ] 准备好至少 **1000 TON** 充值奖池
- [ ] 前后端代码已更新并测试

---

## 部署成本估算

| 合约 | Gas 费用 | 初始充值 |
|------|---------|---------|
| MultiSigColdWallet | ~0.05 TON | - |
| PrizePool | ~0.05 TON | **1000 TON** |
| DepositVault | ~0.05 TON | - |
| DiceGameV2 | ~0.05 TON | - |
| **总计** | **~0.2 TON** | **1000 TON** |

**需要准备：1000.2 TON**（在部署钱包中）

---

## 常见问题

### Q1: 部署失败怎么办？

**A:** 检查以下几点：
1. 钱包余额是否足够（≥1000.2 TON）
2. MULTISIG_SIGNERS 地址是否正确配置
3. 网络连接是否稳定
4. 查看错误日志，可能是某个合约编译失败

### Q2: 可以单独重新部署某个合约吗？

**A:** 可以，但不推荐。如果必须单独部署：

```bash
# 只部署 DepositVault
npx blueprint run deployDepositVault --testnet

# 只部署 PrizePool
npx blueprint run deployPrizePool --testnet
```

然后需要手动更新其他合约的关联地址。

### Q3: 部署后如何验证？

**A:** 使用 TON Explorer 查看合约状态：

```
https://testnet.tonscan.org/address/<合约地址>
```

检查：
- ✅ 合约已激活（Active）
- ✅ PrizePool 余额 = 1000 TON
- ✅ 合约之间的关联正确

### Q4: 如何添加/移除多签管理员？

**A:** 部署后通过 Owner 调用合约方法：

```bash
# 添加新管理员
npx blueprint run addSigner --newSigner EQF... --contract <COLD_WALLET_ADDRESS>

# 移除管理员
npx blueprint run removeSigner --signer EQA... --contract <COLD_WALLET_ADDRESS>
```

---

## 下一步

部署完成后：

1. ✅ 复制 `deployment-v2.env` 到前后端
2. ✅ 重启前后端服务
3. ✅ 测试完整流程（充值 → 游戏 → 提现）
4. ✅ 设置监控告警（热钱包/奖池余额）
5. ✅ 备份部署信息到安全位置

---

**部署支持：** 查看 `ARCHITECTURE_V2.md` 获取详细架构说明
