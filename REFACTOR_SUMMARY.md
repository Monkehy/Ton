# 热冷钱包分离架构 - 重构完成总结

## 📦 交付清单

### 新增合约文件（4个）

| 文件 | 行数 | 功能 |
|------|------|------|
| `contracts/DepositVault.tact` | ~350 | 充值热钱包合约，10/90 分流 |
| `contracts/PrizePool.tact` | ~250 | 奖池合约，支付奖金和返水 |
| `contracts/MultiSigColdWallet.tact` | ~300 | 多签冷钱包，3/5 管理员签名 |
| `contracts/DiceGameV2.tact` | ~230 | 纯游戏逻辑，不存储资金 |

### 文档文件（2个）

| 文件 | 内容 |
|------|------|
| `ARCHITECTURE_V2.md` | 架构说明、部署步骤、运维监控、故障恢复 |
| `FRONTEND_BACKEND_MIGRATION.md` | 前后端适配指南、改动清单、测试要点 |

---

## 🏗️ 架构对比

### 旧架构（V1）

```
                  DiceGame (单一合约)
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   用户充值      游戏逻辑      资金存储
   (混在一起)   (随机数)    (balance/claimable)
```

**问题：**
- ❌ 充值和奖池资金混在一起，安全风险高
- ❌ 所有 TON 都在一个合约里，容易被攻击
- ❌ 无法灵活管理资金流动
- ❌ 提现依赖单一合约余额

---

### 新架构（V2）

```
                    DiceGameV2 (纯游戏逻辑)
                         ▲
                         │ 调用
            ┌────────────┴────────────┐
            │                         │
    DepositVault              PrizePool
   (用户充值存储)           (平台奖池)
      │                         │
      ├─ 10% 热钱包            ├─ 支付奖金
      │  (即时提现)            └─ 支付返水
      │
      └─ 90% 冷钱包
         (MultiSigColdWallet)
         3/5 管理员签名
```

**优势：**
- ✅ **资金物理隔离**：充值和奖池完全分开
- ✅ **热冷钱包分离**：90% 充值在冷钱包，攻击只影响 10%
- ✅ **多签保护**：冷钱包需要 3/5 管理员签名才能转账
- ✅ **灵活扩展**：可独立升级游戏逻辑、充值逻辑、奖池逻辑
- ✅ **精确审计**：每个合约职责单一，易于审计

---

## 🔐 安全特性

### 1. 热钱包保护

- **限额机制**：单笔提现 ≤ 10 TON
- **余额监控**：低于 5 TON 自动告警
- **自动限流**：热钱包耗尽时大额提现进入待处理队列

### 2. 冷钱包多签

- **3/5 签名**：任何转账需要至少 3 个管理员确认
- **提案机制**：任意管理员可提案，其他人签名
- **自动执行**：达到阈值（3个签名）后自动转账

### 3. 奖池风控

- **最大赔付**：单局最多赔付奖池的 1%
- **储备底线**：奖池不得低于 1000 TON
- **低位告警**：奖池低于 2000 TON 自动告警

---

## 📊 资金流向示例

### 充值 100 TON

```
用户 ──100 TON──→ DepositVault
                    │
                    ├─ 10 TON  保留在热钱包（即时提现）
                    └─ 90 TON  转到 MultiSigColdWallet（冷存储）
                    
用户余额: 100 TON（逻辑记账）
```

### 游戏 1 TON 并赢得 2 TON

```
1. 扣款
   DiceGameV2 ──→ DepositVault: 扣除 1 TON
   用户余额: 100 - 1 = 99 TON

2. 支付奖金
   DiceGameV2 ──→ PrizePool: 支付 2 TON
   PrizePool ──2 TON──→ 用户钱包
   
最终结果：用户钱包 +2 TON，DepositVault 余额 99 TON
```

### 小额提现 5 TON

```
用户 ──WithdrawRequest──→ DepositVault
                            │
                   检查热钱包余额 ≥ 5 TON
                            │
                            ✓
                            │
                  热钱包 ──5 TON──→ 用户钱包
                  
热钱包余额: 10 - 5 = 5 TON（触发低位告警）
```

### 大额提现 50 TON

```
用户 ──WithdrawRequest──→ DepositVault
                            │
                   检查热钱包余额 ≥ 50 TON
                            │
                            ✗ （热钱包只有 5 TON）
                            │
                   进入待处理队列
                            │
                  触发 WithdrawalPending 事件
                  
管理员处理：
1. Signer1 ──ProposeWithdrawal──→ MultiSigColdWallet
2. Signer2,3 ──SignTransaction──→ 达到 3/5 阈值
3. MultiSigColdWallet ──50 TON──→ 用户钱包
4. Owner ──ProcessPendingWithdrawal──→ DepositVault（更新账本）
```

---

## 🚀 部署顺序

1. **MultiSigColdWallet**（冷钱包，需要 5 个管理员地址）
2. **PrizePool**（奖池，需要充值 ≥1000 TON 启动资金）
3. **DepositVault**（充值合约，绑定冷钱包地址）
4. **DiceGameV2**（游戏合约，绑定 Vault 和 Pool）
5. **更新关联**（设置 Vault 和 Pool 的 gameContract 为 DiceGameV2）

详细步骤见 `ARCHITECTURE_V2.md`

---

## 🔧 前后端改动要点

### 前端（3 处主要改动）

1. **充值**：目标地址从 `DICE_GAME` 改为 `DEPOSIT_VAULT`
2. **提现**：目标地址从 `DICE_GAME` 改为 `DEPOSIT_VAULT`
3. **游戏**：目标地址从 `DICE_GAME` 改为 `DICE_GAME_V2`

### 后端（2 处主要改动）

1. **查询余额**：从 `DepositVault.balanceOf()` 获取
2. **事件监听**：监听 3 个合约（DiceGameV2, DepositVault, PrizePool）

详细代码见 `FRONTEND_BACKEND_MIGRATION.md`

---

## 📈 运维监控

### 每日检查

```bash
# 1. 检查热钱包余额
npx blueprint run getVaultStats | grep hotReserve

# 2. 检查奖池余额
npx blueprint run getPoolStats | grep platformFunds

# 3. 检查待处理提现
npx blueprint run getPendingWithdrawals
```

### 每周操作

```bash
# 周日晚 00:00 手动补充热钱包
npx blueprint run proposeWithdrawal --to VAULT --amount 20
# 等待 3 位管理员签名
```

---

## ⚠️ 重要提醒

### 部署前必读

1. **备份管理员私钥**：5 个多签管理员私钥务必离线备份
2. **奖池充值**：部署后立即充值 ≥1000 TON 到 PrizePool
3. **测试网先行**：先在 testnet 完整测试一遍流程
4. **Gas 费用**：多合约交互会增加 gas，建议每笔交易多附加 0.05 TON

### 迁移注意

- **暂停旧合约**：迁移前暂停旧合约的充值和游戏功能
- **导出用户余额**：将旧合约所有用户的 balance/claimable 导出
- **手动迁移大户**：通知前 10 大户手动提现并充值到新合约
- **脚本迁移小户**：余额 < 1 TON 的用户由后端脚本批量迁移

---

## 📞 问题排查

### 热钱包耗尽

**症状：** 用户无法小额提现

**解决：**
```bash
# 从冷钱包紧急补充
npx blueprint run proposeWithdrawal --urgent --amount 50
# 3 位管理员快速签名
```

### 奖池不足

**症状：** 游戏无法支付奖金

**解决：**
```bash
# 平台紧急充值
npx blueprint run fundPrizePool --amount 500
```

### 管理员丢失私钥

**解决：**
```bash
# Owner 移除旧管理员，添加新管理员
npx blueprint run removeSigner --signer OLD_ADDR
npx blueprint run addSigner --newSigner NEW_ADDR
```

---

## ✅ 完成度

- [x] 充值热钱包合约（DepositVault）
- [x] 奖池合约（PrizePool）
- [x] 多签冷钱包合约（MultiSigColdWallet）
- [x] 纯游戏逻辑合约（DiceGameV2）
- [x] 架构文档和部署指南
- [x] 前后端适配指南
- [x] 运维监控和故障恢复文档

**状态：✅ 100% 完成，可以开始部署和测试**

---

## 📚 下一步

1. **编译合约**
   ```bash
   cd contracts
   npx blueprint build DepositVault
   npx blueprint build PrizePool
   npx blueprint build MultiSigColdWallet
   npx blueprint build DiceGameV2
   ```

2. **在 testnet 部署**（按 ARCHITECTURE_V2.md 步骤）

3. **前后端适配**（按 FRONTEND_BACKEND_MIGRATION.md 改动）

4. **测试流程**
   - 充值 → 查余额 → 游戏 → 提现
   - 大额提现 → 冷钱包签名流程
   - 热钱包/奖池低位告警

5. **mainnet 部署**（测试通过后）

---

**重构完成时间：** 2025-02-26  
**合约总行数：** ~1130 行  
**文档总字数：** ~8000 字  
**预计部署时间：** 2-3 小时（含测试）
