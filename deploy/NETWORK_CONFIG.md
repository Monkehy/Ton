# 🌐 网络配置说明

## 📊 当前配置状态

### ✅ **Testnet（当前）**

部署脚本默认使用 **Testnet** 配置：

| 配置项 | 值 |
|--------|-----|
| 网络 | `ton_testnet` |
| API | `https://testnet.tonapi.io` |
| RPC | `https://testnet.toncenter.com/api/v2/jsonRPC` |
| 合约 | Testnet 合约地址 |

**适用于：**
- ✅ 开发测试
- ✅ 功能验证
- ✅ 压力测试
- ✅ 用户体验测试

---

## 🔄 切换到 Mainnet

### **准备工作**

在切换到 Mainnet 前，确保：

1. ✅ **Testnet 功能测试完成**
   - 充值流程正常
   - 游戏逻辑正确
   - 提现功能正常
   - 无重大 bug

2. ✅ **合约已部署到 Mainnet**
   ```bash
   cd /Users/feng/Documents/Ton/contracts
   npx blueprint run deployAll --mainnet --tonconnect
   ```
   
3. ✅ **获得 Mainnet 合约地址**
   - MultiSigColdWallet
   - PrizePool
   - DepositVault
   - DiceGameV2

4. ✅ **准备足够的主网 TON**
   - 初始奖池：根据需求（建议至少 100 TON）
   - 运营资金：用于 gas 费用

---

### **切换步骤**

#### **方法 1：使用脚本自动切换**

```bash
cd /Users/feng/Documents/Ton/deploy
./switch-to-mainnet.sh
```

然后手动更新合约地址（脚本会提示）。

#### **方法 2：手动修改配置**

编辑 `deploy/deploy.sh`，修改以下内容：

**后端配置（第 169-178 行）：**
```bash
# 修改前（Testnet）
CHAIN_PROVIDER=ton_testnet
TONAPI_BASE_URL=https://testnet.tonapi.io
TON_TESTNET_CONTRACT_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
TON_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
TON_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS
TON_RPC_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC

# 修改后（Mainnet）
CHAIN_PROVIDER=ton_mainnet
TONAPI_BASE_URL=https://tonapi.io
TON_MAINNET_CONTRACT_ADDRESS=YOUR_MAINNET_DICEGAME_ADDRESS
TON_DEPOSIT_VAULT_ADDRESS=YOUR_MAINNET_DEPOSITVAULT_ADDRESS
TON_PRIZE_POOL_ADDRESS=YOUR_MAINNET_PRIZEPOOL_ADDRESS
TON_RPC_ENDPOINT=https://toncenter.com/api/v2/jsonRPC
```

**前端配置（第 195-204 行）：**
```bash
# 修改前（Testnet）
VITE_NETWORK=testnet

# 修改后（Mainnet）
VITE_NETWORK=mainnet
```

---

## 🔍 环境对比

| 特性 | Testnet | Mainnet |
|------|---------|---------|
| TON | 免费测试币 | 真实 TON |
| 交易速度 | 较慢（可能超时） | 快速稳定 |
| 合约地址 | 以 `0Q`/`kQ` 开头 | 以 `EQ`/`UQ` 开头 |
| API | testnet.tonapi.io | tonapi.io |
| 浏览器 | testnet.tonscan.org | tonscan.org |
| 风险 | 无（测试） | 有（真实资金） |

---

## ⚠️ Mainnet 上线检查清单

### **上线前**

- [ ] Testnet 完整测试通过
- [ ] 合约代码审计完成
- [ ] 安全性测试完成
- [ ] 压力测试完成
- [ ] 备份和恢复方案就绪

### **部署时**

- [ ] 合约部署到 Mainnet
- [ ] 合约关联配置完成
- [ ] 初始奖池充值到位
- [ ] 服务器部署完成
- [ ] HTTPS 配置正确

### **上线后**

- [ ] 小额测试交易验证
- [ ] 监控系统就绪
- [ ] 告警机制配置
- [ ] 客服支持准备
- [ ] 应急预案准备

---

## 💡 建议

### **灰度发布**

不要直接全量切换到 Mainnet，建议：

1. **阶段 1：内部测试（Mainnet）**
   - 用小额资金测试
   - 核心团队试玩
   - 验证所有功能

2. **阶段 2：小范围公测**
   - 邀请少量用户
   - 初始奖池设置较小
   - 设置单笔限额

3. **阶段 3：正式上线**
   - 逐步放开限制
   - 增加奖池金额
   - 全面推广

### **双环境运行**

可以同时保持 Testnet 和 Mainnet 环境：

```
Testnet: test.yourdomain.com  → 用于新功能测试
Mainnet: dice.yourdomain.com  → 生产环境
```

---

## 📞 需要帮助？

切换到 Mainnet 前，建议：
1. 完成所有 Testnet 测试
2. 准备好 Mainnet 合约地址
3. 确认理解风险和应急预案

有任何问题随时问我！
