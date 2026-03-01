# 🚀 直接部署脚本使用指南

这是一个独立的部署脚本，**不依赖 Blueprint 的钱包选择器**，直接使用助记词进行部署。

---

## 📋 准备工作

### 1. 准备助记词
- 需要一个有足够余额的钱包助记词（24个单词）
- **Testnet**: 需要至少 **120 TON** 测试币
- **Mainnet**: 需要至少 **1020 TON** 真实 TON

### 2. 配置多签地址
编辑 `scripts/deployDirect.ts`，更新相应的配置：

```typescript
// Testnet 配置
const TESTNET_CONFIG = {
  multiSigSigners: [
    "0Q...", // 替换为你的 testnet 地址 1
    "0Q...", // 替换为你的 testnet 地址 2  
    "0Q...", // 替换为你的 testnet 地址 3
  ],
  initialPrizePoolAmount: "100",
  // ...
};

// Mainnet 配置
const MAINNET_CONFIG = {
  multiSigSigners: [
    "UQ...", // 替换为你的 mainnet 地址 1
    "UQ...", // 替换为你的 mainnet 地址 2
    "UQ...", // 替换为你的 mainnet 地址 3
  ],
  initialPrizePoolAmount: "1000",
  // ...
};
```

---

## 🎯 使用方法

### 方法 1：通过环境变量传递助记词

#### 部署到 Testnet
```bash
cd /Users/feng/Documents/Ton/contracts
NETWORK=testnet MNEMONIC="word1 word2 word3 ... word24" npm run deploy:direct
```

#### 部署到 Mainnet
```bash
cd /Users/feng/Documents/Ton/contracts
NETWORK=mainnet MNEMONIC="word1 word2 word3 ... word24" npm run deploy:direct
```

---

### 方法 2：交互式输入助记词（更安全）

#### 部署到 Testnet
```bash
cd /Users/feng/Documents/Ton/contracts
NETWORK=testnet npm run deploy:direct
```

然后在提示时输入你的 24 个助记词。

#### 部署到 Mainnet
```bash
cd /Users/feng/Documents/Ton/contracts
NETWORK=mainnet npm run deploy:direct
```

---

## 📊 部署流程

脚本会按以下顺序执行：

1. **验证配置**
   - 显示网络、多签地址等配置
   - 检测是否有占位符地址
   - 等待用户确认

2. **初始化钱包**
   - 从助记词恢复钱包
   - 显示钱包地址和余额
   - 检查余额是否足够

3. **部署合约**
   ```
   [1/4] MultiSigColdWallet（多签冷钱包）
   [2/4] PrizePool（奖池合约 + 充值）
   [3/4] DepositVault（充值热钱包）
   [4/4] DiceGameV2（游戏逻辑合约）
   ```

4. **等待确认**
   - 每个合约部署后会等待链上确认
   - 最多等待 2 分钟
   - 超时会显示浏览器链接供手动检查

5. **保存部署信息**
   - 生成 `deployment-testnet.json` 或 `deployment-mainnet.json`
   - 包含所有合约地址和浏览器链接

---

## ✅ 部署完成后

### 1. 查看部署结果

```bash
# Testnet
cat /Users/feng/Documents/Ton/deployment-testnet.json

# Mainnet
cat /Users/feng/Documents/Ton/deployment-mainnet.json
```

### 2. 更新前端配置

编辑 `frontend/.env`：

```env
VITE_DICE_GAME_ADDRESS=<DiceGameV2 地址>
VITE_DEPOSIT_VAULT_ADDRESS=<DepositVault 地址>
VITE_NETWORK=testnet  # 或 mainnet
```

### 3. 更新后端配置

编辑 `backend/.env`：

```env
TON_TESTNET_CONTRACT_ADDRESS=<DiceGameV2 地址>
TON_DEPOSIT_VAULT_ADDRESS=<DepositVault 地址>
CHAIN_PROVIDER=ton_testnet  # 或 ton_mainnet
```

---

## 📝 完整示例

### Testnet 部署示例

```bash
# 1. 编译合约
cd /Users/feng/Documents/Ton/contracts
npm run build

# 2. 部署（交互式）
NETWORK=testnet npm run deploy:direct

# 输出示例：
🚀 TON V2 Architecture Direct Deployment Script
════════════════════════════════════════════════════════════
📋 Deployment Configuration (TESTNET)
════════════════════════════════════════════════════════════
Network: testnet
RPC Endpoint: https://testnet.toncenter.com/api/v2/jsonRPC
Initial Prize Pool: 100 TON
Multi-Sig Signers:
  1. 0QAbc123...
  2. 0QDef456...
  3. 0QGhi789...
════════════════════════════════════════════════════════════

Continue with deployment? (yes/no): yes

🔑 Please enter your 24-word mnemonic phrase:
word1 word2 word3 ... word24

✅ Mnemonic received

🔐 Initializing wallet...
   Wallet Address: 0QAbc123xyz...
   
🌐 Connecting to TON network...
   Wallet Balance: 150.00 TON
   Current Seqno: 42

📦 [1/4] Deploying MultiSigColdWallet...
   Address: EQ...
   Sending deployment transaction...
   Waiting for deployment confirmation...
   ✅ MultiSigColdWallet deployed successfully!

📦 [2/4] Deploying PrizePool...
   Address: EQ...
   Sending deployment transaction...
   Waiting for deployment confirmation...
   ✅ PrizePool deployed successfully!

💰 Funding prize pool with 100 TON...
   ✅ Prize pool funded

📦 [3/4] Deploying DepositVault...
   Address: EQ...
   Sending deployment transaction...
   Waiting for deployment confirmation...
   ✅ DepositVault deployed successfully!

📦 [4/4] Deploying DiceGameV2...
   Address: EQ...
   Sending deployment transaction...
   Waiting for deployment confirmation...
   ✅ DiceGameV2 deployed successfully!

════════════════════════════════════════════════════════════
🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!
════════════════════════════════════════════════════════════

📄 Deployment info saved to: deployment-testnet.json

Deployed Contracts:
  1. MultiSigColdWallet: EQ...
  2. PrizePool:          EQ...
  3. DepositVault:       EQ...
  4. DiceGameV2:         EQ...

Explorer Links:
  MultiSig: https://testnet.tonscan.org/address/EQ...
  PrizePool: https://testnet.tonscan.org/address/EQ...
  Deposit: https://testnet.tonscan.org/address/EQ...
  Game: https://testnet.tonscan.org/address/EQ...

════════════════════════════════════════════════════════════

✅ Next Steps:
  1. Update frontend/.env with new contract addresses
  2. Update backend/.env with new contract addresses
  3. Test the full flow: deposit → game → withdraw
  4. Configure SetGameContract messages (may require multi-sig)
```

---

## ⚠️ 安全提示

1. **永远不要泄露助记词**
   - 不要通过命令行历史暴露助记词
   - 使用交互式输入更安全
   - 部署后清理终端历史

2. **使用专用部署钱包**
   - 建议创建一个专门用于部署的钱包
   - 不要使用存有大量资金的主钱包

3. **Testnet 先测试**
   - 务必在 testnet 上完整测试后再部署到 mainnet
   - Testnet 部署是免费的（使用测试币）

4. **备份部署信息**
   - 保存好 `deployment-*.json` 文件
   - 记录所有合约地址

---

## 🔧 故障排除

### 错误：Insufficient balance
**解决：** 钱包余额不足，需要充值

### 错误：Invalid mnemonic
**解决：** 助记词格式错误，确保是 24 个单词，用空格分隔

### 错误：Deployment timeout
**可能原因：** 网络拥堵或 RPC 节点响应慢
**解决：** 
1. 访问浏览器链接检查合约是否已部署
2. 如果已部署成功，继续下一步
3. 如果未部署，重新运行脚本

### 错误：Seqno mismatch
**解决：** 等待几秒后重试，或重启脚本

---

## 📞 需要帮助？

如果遇到问题，请提供：
- 完整的错误信息
- 使用的网络（testnet/mainnet）
- 钱包余额截图
- 部署日志

祝部署顺利！🎉
