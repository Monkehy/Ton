# Contract Interface v1（Tact）

## 1. 设计目标

- 所有金额口径使用 `nanoTON`（整型）。
- 本局流程原子化：创建 -> 随机 -> 结算 -> 事件落链。
- 外发失败不影响主流程，转为 `claimable`。
- 支持 `autoPause`、`reserveFloor`、`maxAmount` 动态校验。

## 2. 常量与参数

- `MARGIN_TARGET_BPS = 475`（4.75%）
- `REBATE_BPS = 50`（0.5%）
- `PLATFORM_BPS = 300`（3.0%）
- `REFERRAL_BPS = 100`（1.0%，仅有引荐时记账）
- `BPS_DENOM = 10000`
- `MIN_AMOUNT = 0.1 TON`
- `SAFETY_FACTOR_PPM = 20000`（0.02，百万分比）
- `RESERVE_FLOOR = 1000 TON`
- `ALLOWED_THRESHOLD = {2, 3, 4, 5}`

说明：
- 平台与引荐均采用记账模式，不要求每局外发。
- 玩家回款优先级高于其他提现。

## 3. 数据结构

### 3.1 全局状态

- `owner: Address`
- `paused: Bool`
- `emergency: Bool`
- `minAmount: Int`
- `reserveFloor: Int`
- `safetyFactorPpm: Int`
- `poolBalance: Int`
- `platformAccrual: Int`
- `totalRebatePaid: Int`
- `roundSeq: Int`

### 3.2 映射

- `referrerOf[player] => referrer`
- `referralAccrual[referrer] => amount`
- `claimable[player] => amount`
- `roundById[id] => RoundRecord`

### 3.3 RoundRecord

- `roundId: Int`
- `player: Address`
- `direction: Int`（`1` 表示 `>=`，`0` 表示 `<=`）
- `threshold: Int`
- `amount: Int`
- `roll: Int`（1~6）
- `result: Int`（`1` 成功，`0` 失败）
- `payout: Int`
- `rebate: Int`
- `platformDelta: Int`
- `referralDelta: Int`
- `state: Int`（0 created, 1 resolved, 2 settled, 3 failed）
- `createdAt: Int`

## 4. 对外消息接口

## 4.1 玩家消息

### `PlayRound`

字段：
- `direction: Int`（0/1）
- `threshold: Int`（仅允许 2/3/4/5）
- `clientNonce: Int`（防重放辅助）

规则：
- `msg.value >= minAmount`
- 合约实时计算 `maxAmount`，并校验 `msg.value <= maxAmount`
- `paused/emergency` 状态拒绝
- 成功后生成 `roundId`

### `Claim`

字段：
- `amount: Int`（可选，0 表示全额）

规则：
- 仅允许提取 `claimable[player]` 范围内余额

## 4.2 管理消息（仅 owner）

### `SetConfig`

字段：
- `minAmount`
- `reserveFloor`
- `safetyFactorPpm`

### `Pause` / `Resume`

规则：
- `Pause` 仅切换受理状态，不影响查询和提取
- `Resume` 前需满足 `poolBalance >= reserveFloor`

### `TopUpPool`

规则：
- owner 主动补充池子，用于解除 `autoPause`

### `OwnerWithdraw`

字段：
- `amount: Int`

规则：
- 仅可提取“满足偿付保底后”的 owner 可提部分
- 不允许突破 `reserveFloor`

### `ReferralWithdraw`

字段：
- `amount: Int`

规则：
- 仅可提取调用者自身 `referralAccrual`

## 5. 结算逻辑

## 5.1 命中概率

- `p = hitCount / 6`
- 常规：`hitCount(<=T) = T`，`hitCount(>=T) = 7 - T`
- 边界防必胜修正：
  - 当 `T = 1` 且方向为 `>=` 时，按 `>1` 处理，`hitCount = 5`
  - 当 `T = 6` 且方向为 `<=` 时，按 `<6` 处理，`hitCount = 5`

## 5.2 目标倍率（由离线表固化为整数分数）

- `M(p) = (1 - 0.0475 - (1 - p) * 0.005) / p`

推荐将倍率用 `(num, den)` 存储，避免浮点误差。

## 5.3 输赢处理

- 成功：
  - `payout = amount * M(p)`（按整数分数向下取整）
  - 若主外发失败，记入 `claimable[player]`
- 失败：
  - `rebate = amount * 0.005`
  - 返还失败则记入 `claimable[player]`

## 5.4 分润与平台记账

- 若存在引荐：
  - `referralDelta = amount * 1%` 记入 `referralAccrual[referrer]`
  - `platformDelta = amount * 3%` 记入 `platformAccrual`
- 若无引荐：
  - `referralDelta = 0`
  - `platformDelta = amount * 4%` 记入 `platformAccrual`

## 6. maxAmount 计算

- `availablePool = max(0, poolBalance - reserveFloor)`
- `worstLossRate = 0.96`（记账外发路径）
- `maxAmount = floor((availablePool * safetyFactor) / worstLossRate)`

当 `poolBalance < reserveFloor` 或 `maxAmount < minAmount`：
- 触发 `autoPause = true`

## 7. 错误码（建议）

- `1001 ERR_NOT_OWNER`
- `1002 ERR_PAUSED`
- `1003 ERR_EMERGENCY`
- `1004 ERR_AMOUNT_TOO_SMALL`
- `1005 ERR_AMOUNT_TOO_LARGE`
- `1006 ERR_INVALID_THRESHOLD`
- `1007 ERR_INVALID_DIRECTION`
- `1008 ERR_POOL_UNDER_RESERVE`
- `1009 ERR_INSUFFICIENT_LIQUIDITY`
- `1010 ERR_CLAIM_EXCEED`
- `1011 ERR_REFERRAL_BIND_LOCKED`
- `1012 ERR_DUP_NONCE`

## 8. 事件（必须落链）

### `RoundSettled`

- `roundId`
- `player`
- `direction`
- `threshold`
- `amount`
- `roll`
- `result`
- `payout`
- `rebate`
- `platformDelta`
- `referralDelta`
- `state`

### `ModeChanged`

- `paused`
- `emergency`
- `reasonCode`

### `ConfigUpdated`

- `minAmount`
- `reserveFloor`
- `safetyFactorPpm`

### `Withdrawn`

- `who`
- `kind`（owner/referral/playerClaim）
- `amount`

## 9. 测试最小集

- 阈值合法性：仅 2/3/4/5 可通过
- 边界一致性：`1 猜大` 与 `6 猜小` 同命中概率（5/6）并同倍率（1.1420）
- `maxAmount` 边界：刚好通过/刚好失败
- 外发失败：进入 `claimable`
- `autoPause`：低于准备金自动生效
- 提现优先级：玩家相关请求优先
