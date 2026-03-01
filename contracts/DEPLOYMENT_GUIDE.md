# 🚀 合约部署指南

## 📋 准备工作

### 1️⃣ **获取 Testnet 钱包地址**

你需要准备 **3 个 testnet 钱包地址**用于多签冷钱包配置。

#### 方法 A：使用 Tonkeeper（推荐）
1. 打开 Tonkeeper APP
2. 进入设置 → 开发者模式 → 启用 Testnet
3. 创建或切换到 testnet 钱包
4. 复制钱包地址（格式：`0Q...` 或 `kQ...`）
5. 重复步骤创建 3 个测试钱包

#### 方法 B：使用 Tonhub
1. 打开 Tonhub APP
2. 切换到 Testnet 模式
3. 创建新钱包并复制地址

---

### 2️⃣ **获取测试币**

每个钱包需要至少：
- 部署钱包：**50 TON**（用于部署合约的 gas 费用）
- 其他两个钱包：**5 TON**（用于多签操作）

**领取方式：**
- Telegram Bot：[@testgiver_ton_bot](https://t.me/testgiver_ton_bot)
- 输入你的 testnet 地址，每次可领取 5-10 TON
- 需要多次领取来达到 50 TON

---

### 3️⃣ **更新部署配置**

打开 `contracts/scripts/deployAll.ts`，找到 `TESTNET_CONFIG` 部分：

```typescript
const TESTNET_CONFIG = {
  multiSigSigners: [
    "0QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATest1", // ← 替换成你的地址 1
    "0QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATest2", // ← 替换成你的地址 2
    "0QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATest3", // ← 替换成你的地址 3
  ],
  initialPrizePoolAmount: "100", // Testnet 用 100 TON 即可
};
```

**替换为你的真实地址！**

---

## 🚀 开始部署

### 部署到 Testnet

```bash
cd /Users/feng/Documents/Ton/contracts
npm run deploy:testnet
```

### 部署过程

1. 系统会提示选择钱包（选择余额足够的那个）
2. 确认多签地址配置
3. 依次部署 4 个合约：
   - MultiSigColdWallet（多签冷钱包）
   - PrizePool（奖池合约）
   - DepositVault（充值热钱包）
   - DiceGameV2（游戏逻辑合约）
4. 自动充值初始奖池（100 TON）
5. 配置合约关联关系
6. 保存部署记录到 `deployment-v2.json`

---

## ✅ 部署完成后

### 1. 检查部署结果

查看生成的配置文件：
```bash
cat /Users/feng/Documents/Ton/deployment-v2.json
```

### 2. 更新前端配置

编辑 `frontend/.env`：
```env
VITE_DICE_GAME_ADDRESS=<DiceGameV2 合约地址>
VITE_DEPOSIT_VAULT_ADDRESS=<DepositVault 合约地址>
VITE_NETWORK=testnet
```

### 3. 更新后端配置

编辑 `backend/.env`：
```env
TON_TESTNET_CONTRACT_ADDRESS=<DiceGameV2 合约地址>
TON_DEPOSIT_VAULT_ADDRESS=<DepositVault 合约地址>
CHAIN_PROVIDER=ton_testnet
```

### 4. 验证合约

在 TON Testnet Explorer 查看：
- Testnet 浏览器：https://testnet.tonscan.org/
- 搜索你的合约地址确认部署成功

---

## 🔧 常见问题

### Q1: 部署失败 - 余额不足
**错误：** `Not enough balance`

**解决：**
- 检查钱包余额是否 ≥ 110 TON（100 TON 奖池 + 10 TON gas）
- 去 testgiver_ton_bot 再领取一些测试币

### Q2: 地址格式错误
**错误：** `Invalid address format`

**解决：**
- 确保使用的是 **testnet 地址**（通常以 `0Q` 或 `kQ` 开头）
- 不要使用 mainnet 地址（以 `UQ` 或 `EQ` 开头）

### Q3: 网络超时
**错误：** `Network timeout`

**解决：**
- 等待 30 秒后重试
- 脚本会自动重试 3 次
- 即使超时，合约可能已经部署成功，检查浏览器确认

### Q4: 多签地址是占位符
**警告：** `Current signers look like placeholders!`

**解决：**
- 打开 `deployAll.ts` 文件
- 替换 `TESTNET_CONFIG.multiSigSigners` 中的地址
- 确保是 3 个有效的 testnet 地址

---

## 📊 费用估算

| 项目 | Testnet | Mainnet |
|------|---------|---------|
| 部署 4 个合约 | ~10 TON | ~10 TON |
| 初始奖池充值 | 100 TON | 1000 TON |
| **总计** | **110 TON** | **1010 TON** |

---

## 🎯 下一步

部署完成后：

1. ✅ 测试充值功能（DepositVault）
2. ✅ 测试游戏流程（DiceGameV2）
3. ✅ 测试提现功能（MultiSigColdWallet）
4. ✅ 压力测试（模拟多个玩家）
5. ✅ 确认无误后部署到 Mainnet

---

## 🆘 需要帮助？

如果遇到问题，请提供：
- 错误信息截图
- 钱包地址
- 部署日志（如果有）

我会帮你解决！
