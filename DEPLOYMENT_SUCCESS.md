# 🎉 TON V2 架构 Testnet 部署完成！

**部署时间：** 2026-02-27

---

## ✅ 已部署的合约

| 合约 | 地址 | 状态 |
|------|------|------|
| **MultiSigColdWallet** | `kQD_18_1r54BdkGo40ajmhKpWCqDRUSrAqtV1yZSLEzC2Jha` | ✅ Active |
| **PrizePool** | `EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS` | ✅ Active (已充值 0.1 TON) |
| **DepositVault** | `EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P` | ✅ Active |
| **DiceGameV2** | `EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut` | ✅ Active |

---

## 🔗 浏览器链接

- MultiSigColdWallet: https://testnet.tonscan.org/address/kQD_18_1r54BdkGo40ajmhKpWCqDRUSrAqtV1yZSLEzC2Jha
- PrizePool: https://testnet.tonscan.org/address/EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS
- DepositVault: https://testnet.tonscan.org/address/EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
- DiceGameV2: https://testnet.tonscan.org/address/EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut

---

## ⚠️ 重要：需要配置合约关联

**当前状态：** 合约关联关系尚未配置（用户拒绝了交易）

### 为什么需要配置？

- PrizePool 需要知道谁是授权的游戏合约（才能支付奖金）
- DepositVault 需要知道谁是授权的游戏合约（才能处理充值）

### 如何配置？

**方法 1：重新运行部署脚本（推荐）**

```bash
cd /Users/feng/Documents/Ton/contracts
npx blueprint run deployAll --testnet --tonconnect
```

所有合约选择 "yes" 跳过，只执行配置步骤，在 Tonkeeper 中**确认交易**。

**方法 2：手动发送消息（高级）**

通过 Tonkeeper 或其他工具向以下合约发送消息：

1. **PrizePool** (`EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS`)
   - 消息类型：`SetGameContract`
   - 参数：`newGameContract = EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut`

2. **DepositVault** (`EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P`)
   - 消息类型：`SetGameContract`
   - 参数：`newGameContract = EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut`

---

## ✅ 配置文件已更新

### Frontend (.env)

```env
VITE_DICE_GAME_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
VITE_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
VITE_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS
VITE_NETWORK=testnet
```

### Backend (.env)

```env
CHAIN_PROVIDER=ton_testnet
TONAPI_BASE_URL=https://testnet.tonapi.io
TON_TESTNET_CONTRACT_ADDRESS=EQBhTqBrGrc_qH_uNYyacb7yOUewfTdUEyOCE4jJY3O3dDut
TON_DEPOSIT_VAULT_ADDRESS=EQAZ0z67dRu0GNuCmkqkmwDhuhMiZ4_HNw5hqVdvq5-fOq0P
TON_PRIZE_POOL_ADDRESS=EQBkO3DZNMGkBzRZWfhh_GutLDoMVRY1T2PSj3mPmoovJgdS
TON_RPC_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC
```

---

## 🚀 下一步

### 1. **配置合约关联**（必须）
运行上面提到的配置命令，确保合约能正常通信。

### 2. **测试基本功能**

```bash
# 启动后端
cd backend
npm run dev

# 启动前端
cd frontend
npm run dev
```

### 3. **测试完整流程**

1. **充值测试**
   - 向 DepositVault 发送 TON
   - 检查后端是否检测到充值
   
2. **游戏测试**
   - 连接 Tonkeeper（testnet 模式）
   - 进行游戏下注
   - 检查输赢结果
   
3. **提现测试**
   - 通过多签钱包批准提现
   - 检查资金是否到账

### 4. **压力测试**
模拟多个玩家同时游戏，测试合约性能。

### 5. **部署到 Mainnet**
所有测试通过后，使用相同流程部署到主网。

---

## 📊 部署统计

| 项目 | 数据 |
|------|------|
| 网络 | Testnet |
| 部署者 | `0QDQxfv...xMns` |
| 总部署费用 | ~0.5 TON |
| 初始奖池 | 0.1 TON |
| 部署时长 | ~10 分钟 |
| 合约数量 | 4 个 |

---

## 🎯 成功标志

✅ 所有合约部署成功  
⚠️ 合约关联需要配置  
✅ 配置文件已更新  
⏳ 等待测试验证  

---

**恭喜完成 Testnet 部署！** 🎉

记得先完成合约关联配置，然后进行完整测试。祝测试顺利！
