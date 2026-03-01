# 热冷钱包分离架构 - 部署和迁移指南

## 架构概览

```
用户
 │
 ├──充值──→ DepositVault (充值热钱包合约)
 │           ├── 10% 留在热钱包 (即时提现)
 │           └── 90% 转到 MultiSigColdWallet (多签冷钱包)
 │
 ├──游戏──→ DiceGameV2 (纯游戏逻辑)
 │           ├── 从 DepositVault 扣除押金
 │           └── 向 PrizePool 请求支付奖金/返水
 │
 └──提现──→ DepositVault
             ├── 小额 (≤10 TON): 热钱包直接支付
             └── 大额 (>10 TON): 需要冷钱包手动处理
```

## 合约清单

| 合约 | 文件 | 职责 |
|------|------|------|
| DepositVault | `DepositVault.tact` | 用户充值存储，热冷钱包分流，小额提现 |
| PrizePool | `PrizePool.tact` | 平台奖池，支付游戏奖金和返水 |
| MultiSigColdWallet | `MultiSigColdWallet.tact` | 多签冷钱包，存储90%充值 |
| DiceGameV2 | `DiceGameV2.tact` | 纯游戏逻辑，不存储资金 |

## 部署顺序

### 步骤 1: 部署 MultiSigColdWallet

```bash
cd contracts
npx blueprint build MultiSigColdWallet
npx blueprint run deployMultiSigColdWallet --mainnet
```

**初始化参数：**
- `owner`: 平台管理员地址
- `initialSigners`: 5个管理员地址的 map
  ```typescript
  const signers = {
    0: Address.parse("EQA...signer1"),
    1: Address.parse("EQB...signer2"),
    2: Address.parse("EQC...signer3"),
    3: Address.parse("EQD...signer4"),
    4: Address.parse("EQE...signer5"),
  };
  ```

**记录地址：** `COLD_WALLET_ADDRESS`

---

### 步骤 2: 部署 PrizePool

```bash
npx blueprint build PrizePool
npx blueprint run deployPrizePool --mainnet
```

**初始化参数：**
- `owner`: 平台管理员地址
- `gameContract`: 暂时填 owner，等 DiceGameV2 部署后更新

**初始充值奖池：**
```bash
# 充值 1000 TON 作为奖池启动资金
npx blueprint run fundPrizePool --amount 1000
```

**记录地址：** `PRIZE_POOL_ADDRESS`

---

### 步骤 3: 部署 DepositVault

```bash
npx blueprint build DepositVault
npx blueprint run deployDepositVault --mainnet
```

**初始化参数：**
- `owner`: 平台管理员地址
- `gameContract`: 暂时填 owner，等 DiceGameV2 部署后更新
- `coldWalletAddress`: `COLD_WALLET_ADDRESS`（步骤1的地址）

**记录地址：** `DEPOSIT_VAULT_ADDRESS`

---

### 步骤 4: 部署 DiceGameV2

```bash
npx blueprint build DiceGameV2
npx blueprint run deployDiceGameV2 --mainnet
```

**初始化参数：**
- `owner`: 平台管理员地址
- `depositVault`: `DEPOSIT_VAULT_ADDRESS`（步骤3的地址）
- `prizePool`: `PRIZE_POOL_ADDRESS`（步骤2的地址）

**记录地址：** `DICE_GAME_V2_ADDRESS`

---

### 步骤 5: 更新合约关联

**5.1 更新 PrizePool 的 gameContract**
```bash
# 发送 SetGameContract 消息到 PrizePool
npx blueprint run setGameContract \
  --contract PRIZE_POOL_ADDRESS \
  --newGameContract DICE_GAME_V2_ADDRESS
```

**5.2 更新 DepositVault 的 gameContract**
```bash
# 发送相同消息到 DepositVault
npx blueprint run setGameContract \
  --contract DEPOSIT_VAULT_ADDRESS \
  --newGameContract DICE_GAME_V2_ADDRESS
```

---

## 配置文件更新

### 前端 `.env`

```bash
# 旧的（删除）
VITE_CONTRACT_ADDRESS=EQxxx...old

# 新的
VITE_DEPOSIT_VAULT_ADDRESS=EQxxx...vault
VITE_PRIZE_POOL_ADDRESS=EQxxx...pool
VITE_DICE_GAME_V2_ADDRESS=EQxxx...game
VITE_COLD_WALLET_ADDRESS=EQxxx...cold
```

### 后端 `.env`

```bash
# 新增合约地址
DEPOSIT_VAULT_ADDRESS=EQxxx...vault
PRIZE_POOL_ADDRESS=EQxxx...pool
DICE_GAME_V2_ADDRESS=EQxxx...game
COLD_WALLET_ADDRESS=EQxxx...cold
```

---

## 数据迁移方案

### 方案 A: 软迁移（推荐新项目）

如果是新项目或用户量不大：

1. **暂停旧合约**
   ```bash
   npx blueprint run pauseOldContract
   ```

2. **导出旧合约数据**
   ```typescript
   // 读取所有用户的 balance 和 claimable
   for (const user of allUsers) {
     const balance = await oldContract.getBalanceOf(user);
     const claimable = await oldContract.getClaimableOf(user);
     // 保存到 CSV
   }
   ```

3. **手动迁移大户资金**
   - 通知前 10 大户手动提现
   - 在新合约上重新充值

4. **小户自动迁移**
   - 后端脚本：为每个小户（余额 < 1 TON）在新 DepositVault 上充值

---

### 方案 B: 硬迁移（推荐生产环境）

如果已有大量用户：

1. **创建迁移合约** `Migration.tact`
   - 从旧合约读取所有 balance/claimable
   - 批量转账到新 DepositVault

2. **设置迁移窗口**
   - 公告：2周内完成迁移
   - 旧合约：只允许提现，不允许新充值/游戏

3. **自动迁移脚本**
   ```typescript
   // 每天运行一次
   for (const user of usersWithBalance) {
     if (oldBalance > 0) {
       await newVault.deposit({from: platform, value: oldBalance});
       await newVault.creditUser(user, oldBalance);
     }
   }
   ```

---

## 运维监控

### 热钱包余额监控

```bash
# 每5分钟检查一次
watch -n 300 'npx blueprint run getVaultStats | grep hotReserve'

# 预警阈值
if hotReserve < 5 TON:
  alert("Hot wallet low! Refill needed")
```

### 冷钱包补充 SOP

**每周日晚 00:00 手动执行：**

1. **检查热钱包余额**
   ```bash
   npx blueprint run getVaultStats
   ```

2. **计算需补充金额**
   ```
   targetHot = totalDeposits * 10%
   needRefill = targetHot - currentHot
   ```

3. **多签提案**
   ```bash
   # Signer 1 提案
   npx blueprint run proposeWithdrawal \
     --to DEPOSIT_VAULT_ADDRESS \
     --amount needRefill \
     --reason "Weekly hot wallet refill"
   
   # 记录 txId
   ```

4. **其他管理员签名**
   ```bash
   # Signer 2, 3 依次签名
   npx blueprint run signTransaction --txId xxx
   ```

5. **自动执行**（3个签名后自动转账）

---

## 安全检查清单

### 部署前

- [ ] 所有管理员私钥已离线备份
- [ ] 多签钱包至少 3/5 管理员可用
- [ ] 奖池已充值足够启动资金（≥1000 TON）
- [ ] 所有合约地址已在 `.env` 中配置正确

### 部署后

- [ ] 验证热冷钱包分流比例（10:90）
- [ ] 测试小额提现（<10 TON）
- [ ] 测试大额提现（>10 TON，应进入待处理队列）
- [ ] 测试游戏流程（扣款 → 游戏 → 奖金发放）
- [ ] 监控热钱包余额是否正常递减

### 每周检查

- [ ] 热钱包余额 > 5 TON
- [ ] 奖池余额 > 1000 TON
- [ ] 无待处理提现超过24小时
- [ ] 冷钱包余额与账本一致

---

## 故障恢复

### 热钱包耗尽

**症状：** 用户无法提现，`HotReserveLowAlert` 事件

**解决：**
```bash
# 立即补充热钱包
npx blueprint run proposeWithdrawal --urgent
# 3位管理员快速签名
```

### 奖池不足

**症状：** 游戏无法支付奖金，`PrizePoolLowAlert` 事件

**解决：**
```bash
# 平台充值奖池
npx blueprint run fundPrizePool --amount 500
```

### 多签钱包管理员丢失私钥

**解决：**
```bash
# Owner 移除旧管理员
npx blueprint run removeSigner --signer 0xOLD_ADDRESS

# Owner 添加新管理员
npx blueprint run addSigner --newSigner 0xNEW_ADDRESS
```

---

## 联系方式

- 部署问题：查看 `docs/DEPLOYMENT_ISSUES.md`
- 合约审计报告：`audits/SecurityAudit-v2.pdf`
- 应急联系：emergency@example.com
