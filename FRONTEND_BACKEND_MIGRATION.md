# 前后端适配指南 - 热冷钱包架构

## 前端改动概要

### 1. 环境变量更新 (`frontend/.env`)

```bash
# 删除旧的单一合约地址
-VITE_CONTRACT_ADDRESS=EQxxx...

# 新增多个合约地址
+VITE_DEPOSIT_VAULT_ADDRESS=EQxxx...vault
+VITE_PRIZE_POOL_ADDRESS=EQxxx...pool
+VITE_DICE_GAME_V2_ADDRESS=EQxxx...game
```

### 2. 充值流程改动 (`frontend/src/lib/playRound.ts`)

**旧流程：**
```typescript
// 充值到 DiceGame 合约
buildDepositPayload() → DiceGame.Deposit
```

**新流程：**
```typescript
// 充值到 DepositVault 合约
buildDepositPayload() → DepositVault.Deposit
// 无需改动 payload，只需改目标地址
```

**代码改动：**
```typescript
// frontend/src/pages/EntryGate.tsx
async function handleDeposit() {
  await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [{
-     address: status.contractAddress,  // 旧：游戏合约
+     address: import.meta.env.VITE_DEPOSIT_VAULT_ADDRESS,  // 新：充值合约
      amount: toNano("0.5").toString(),
      payload: buildDepositPayload()
    }]
  });
}
```

### 3. 提现流程改动

**旧流程：**
```typescript
// 从 DiceGame 提现
buildWithdrawBalancePayload() → DiceGame.WithdrawBalance
```

**新流程：**
```typescript
// 从 DepositVault 提现
buildWithdrawRequestPayload(amount) → DepositVault.WithdrawRequest
```

**新增 payload 构建函数：**
```typescript
// frontend/src/lib/playRound.ts
export function buildWithdrawRequestPayload(amountNano: bigint): string {
  const body = beginCell()
    .storeUint(0x12345678, 32)  // OP_WITHDRAW_REQUEST（需从编译后的合约获取）
    .storeUint(amountNano, 257)
    .endCell();
  return body.toBoc().toString("base64");
}
```

### 4. 游戏流程改动

**旧流程：**
```typescript
// PlayRound 发送到 DiceGame
buildPlayRoundPayload() → DiceGame.PlayRound
```

**新流程：**
```typescript
// PlayRound 发送到 DiceGameV2（地址变化，payload 不变）
buildPlayRoundPayload() → DiceGameV2.PlayRound
```

**代码改动：**
```typescript
// frontend/src/pages/NumberLobby.tsx
await tonConnectUI.sendTransaction({
  validUntil: Math.floor(Date.now() / 1000) + 300,
  messages: [{
-   address: contract,  // 旧：可能是游戏合约
+   address: import.meta.env.VITE_DICE_GAME_V2_ADDRESS,  // 新：游戏合约V2
    amount: "0",
    payload: buildPlayRoundPayload(...)
  }]
});
```

### 5. 查询余额改动

**旧流程：**
```typescript
// 从 DiceGame 查询
const balance = await gameContract.getBalanceOf(userAddress);
```

**新流程：**
```typescript
// 从 DepositVault 查询
const balance = await depositVaultContract.getBalanceOf(userAddress);
```

**后端 API 改动：**
```typescript
// backend/src/services/contractReader.ts
export async function readContractSnapshot(walletAddr: string) {
  // 旧：从游戏合约读取
- const balanceTon = await gameContract.getBalanceOf(walletAddr);
  
  // 新：从充值合约读取
+ const vaultContract = client.open(DepositVault.fromAddress(VAULT_ADDRESS));
+ const balanceTon = await vaultContract.getBalanceOf(walletAddr);
  
  return { balanceTon, ... };
}
```

---

## 后端改动概要

### 1. 环境变量更新 (`backend/.env`)

```bash
# 新增合约地址
+DEPOSIT_VAULT_ADDRESS=EQxxx...vault
+PRIZE_POOL_ADDRESS=EQxxx...pool
+DICE_GAME_V2_ADDRESS=EQxxx...game
+COLD_WALLET_ADDRESS=EQxxx...cold
```

### 2. 合约交互适配 (`backend/src/services/contractReader.ts`)

```typescript
import { DepositVault } from '../contracts/DepositVault';
import { PrizePool } from '../contracts/PrizePool';
import { DiceGameV2 } from '../contracts/DiceGameV2';

const VAULT_ADDR = Address.parse(process.env.DEPOSIT_VAULT_ADDRESS!);
const POOL_ADDR = Address.parse(process.env.PRIZE_POOL_ADDRESS!);
const GAME_ADDR = Address.parse(process.env.DICE_GAME_V2_ADDRESS!);

export async function readContractSnapshot(walletAddr: string) {
  const client = getTonClient();
  
  // 1. 从 DepositVault 读取用户余额
  const vault = client.open(DepositVault.fromAddress(VAULT_ADDR));
  const balanceTon = await vault.getBalanceOf(Address.parse(walletAddr));
  
  // 2. 从 PrizePool 读取奖池状态
  const pool = client.open(PrizePool.fromAddress(POOL_ADDR));
  const poolStats = await pool.getPoolStats();
  
  // 3. 从 DiceGameV2 读取游戏状态
  const game = client.open(DiceGameV2.fromAddress(GAME_ADDR));
  const gameConfig = await game.getConfig();
  
  return {
    balanceTon: (Number(balanceTon) / 1e9).toFixed(4),
    maxAmountTon: (Number(poolStats.platformFunds) / 1e9 * 0.01).toFixed(4),  // 1% of pool
    // ... 其他字段
  };
}
```

### 3. 事件监听适配 (`backend/src/workers/scoreConfirmWorker.ts`)

**新增监听合约：**
```typescript
// 旧：只监听 DiceGame 的 RoundSettled
- watchContract(DICE_GAME_ADDRESS, handleRoundSettled);

// 新：监听多个合约
+ watchContract(DICE_GAME_V2_ADDRESS, handleRoundSettled);
+ watchContract(DEPOSIT_VAULT_ADDRESS, handleDepositEvents);
+ watchContract(PRIZE_POOL_ADDRESS, handlePrizePoolEvents);
```

**新增事件处理：**
```typescript
// 处理 DepositVault 事件
async function handleDepositEvents(event: Event) {
  if (event.type === 'DepositReceived') {
    // 记录充值日志
    await db.query(`
      INSERT INTO deposits (user, amount, hot_amount, cold_amount, timestamp)
      VALUES ($1, $2, $3, $4, NOW())
    `, [event.user, event.amount, event.hotAmount, event.coldAmount]);
  }
  
  if (event.type === 'HotReserveLowAlert') {
    // 发送告警
    await sendAlert('Hot wallet low!', event.currentReserve);
  }
}

// 处理 PrizePool 事件
async function handlePrizePoolEvents(event: Event) {
  if (event.type === 'PrizePoolLowAlert') {
    await sendAlert('Prize pool low!', event.currentPool);
  }
}
```

### 4. 数据库 schema 更新 (`backend/BACKEND_SCHEMA_V2.sql`)

```sql
-- 新增充值记录表
CREATE TABLE IF NOT EXISTS deposits (
  id BIGSERIAL PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  amount_nano TEXT NOT NULL,
  hot_amount_nano TEXT NOT NULL,
  cold_amount_nano TEXT NOT NULL,
  tx_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增冷钱包提现待处理表
CREATE TABLE IF NOT EXISTS pending_withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  amount_nano TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',  -- pending/approved/executed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- 更新 rounds 表，添加合约来源
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS contract_version TEXT DEFAULT 'v2';
```

---

## 关键改动检查清单

### 前端

- [ ] 更新 `.env` 中的合约地址（4个）
- [ ] 充值目标改为 `DEPOSIT_VAULT_ADDRESS`
- [ ] 提现目标改为 `DEPOSIT_VAULT_ADDRESS`
- [ ] 游戏目标改为 `DICE_GAME_V2_ADDRESS`
- [ ] 余额查询从 DepositVault 获取
- [ ] 更新 tonconnect-manifest.json（如需要）

### 后端

- [ ] 更新 `.env` 中的合约地址（4个）
- [ ] 更新 `contractReader.ts` 读取逻辑
- [ ] 更新 `scoreConfirmWorker.ts` 事件监听
- [ ] 运行数据库迁移脚本 `BACKEND_SCHEMA_V2.sql`
- [ ] 更新 API 返回的 `maxAmountTon` 计算逻辑
- [ ] 添加热钱包/奖池监控告警

### 测试

- [ ] 充值 → 查余额 → 提现 → 再查余额
- [ ] 游戏 → 赢 → 查奖金 → 再查余额
- [ ] 大额提现 → 验证进入待处理队列
- [ ] 热钱包低于阈值 → 验证告警触发
- [ ] 奖池低于阈值 → 验证告警触发

---

## 临时兼容方案（过渡期）

如果需要同时支持旧合约和新合约：

```typescript
// frontend/src/lib/api.ts
const USE_V2 = import.meta.env.VITE_USE_CONTRACT_V2 === 'true';

export function getContractAddresses() {
  if (USE_V2) {
    return {
      deposit: import.meta.env.VITE_DEPOSIT_VAULT_ADDRESS,
      game: import.meta.env.VITE_DICE_GAME_V2_ADDRESS,
    };
  } else {
    return {
      deposit: import.meta.env.VITE_CONTRACT_ADDRESS,
      game: import.meta.env.VITE_CONTRACT_ADDRESS,
    };
  }
}
```

---

## 预计工作量

| 任务 | 预计时间 |
|------|---------|
| 前端环境变量和地址替换 | 30分钟 |
| 前端 payload 构建函数调整 | 1小时 |
| 后端环境变量和合约读取 | 30分钟 |
| 后端事件监听和告警 | 2小时 |
| 数据库 schema 迁移 | 30分钟 |
| 测试和调试 | 3小时 |
| **总计** | **约 7.5 小时** |

---

## 注意事项

1. **OP codes 更新**：新合约的消息 OP codes 需要重新从编译后的合约中提取
2. **Gas 费用**：多合约交互会增加 gas 消耗，建议充值/游戏时多附加 0.05 TON gas
3. **错误处理**：合约间消息可能失败（bounce），需要在前端增加错误提示
4. **测试网先行**：强烈建议先在 testnet 完整测试一遍流程
