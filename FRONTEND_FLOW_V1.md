# Frontend Flow v1（Telegram Bot + Mini App）

## 1. 目标

- 首次进入无注册，直接识别 Telegram 用户态。
- 连接 TON 钱包后即可发起本局请求。
- 明确“已接收/处理中/已结算/失败”四段体验。
- 文案统一使用中性术语：局、投入、回报、返还。

## 2. 页面与路由

- `EntryGate`
  - 拉取 `/api/user/status`
  - 根据 `mode` 进入 `CleanSnakeGame` 或 `NumberLobby`
- `CleanSnakeGame`
  - 纯休闲页，不出现资金相关动作
- `NumberLobby`
  - 方向选择：`>=T` 或 `<=T`（边界阈值按防必胜规则特判）
  - 阈值：仅 `2/3/4/5`
  - 输入投入金额（最低 `0.1 TON`）
  - 提示当前 `maxAmount`

## 3. 前端状态机

`IDLE -> WALLET_CONNECTING -> READY -> TX_SENDING -> TX_PENDING -> TX_CONFIRMED -> SCORE_PENDING -> SCORE_DONE`

失败支路：

- `TX_SENDING -> TX_FAILED`
- `TX_PENDING -> TX_FAILED`
- `SCORE_PENDING -> SCORE_FAILED`（不影响链上结果，仅影响积分展示）

## 4. 关键交互时序

## 4.1 启动流程

1. Bot 打开 Mini App。
2. 前端读取 Telegram `initData`。
3. 请求 `/api/user/status` 获取：
   - `mode`
   - `pauseState`
   - `maxAmount`
   - `score/level`
4. 渲染对应页面。

## 4.2 本局流程（NumberLobby）

1. 用户连接钱包（TonConnect）。
2. 用户选择方向与阈值（2/3/4/5）。
3. 输入投入金额，前端本地校验：
   - `amount >= 0.1`
   - `amount <= maxAmount`（仅 UI 提示，最终以链上为准）
4. 发起链上交易（调用合约 `PlayRound`）。
5. 成功拿到 `txHash` 后，调用 `/api/score/submit`。
6. 前端轮询 `/api/user/status` 或订阅推送，更新积分状态。

## 5. API 契约（前端视角）

## `GET /api/user/status`

响应示例：

```json
{
  "wallet": "EQ...",
  "mode": "MODE_GAMING",
  "modeReason": "GEO_OK",
  "pauseState": false,
  "maxAmountTon": "12.5000",
  "score": "23.4000",
  "level": "BRONZE",
  "rateLimit": { "windowSec": 10, "maxRequests": 2 }
}
```

## `POST /api/score/submit`

请求：

```json
{
  "wallet": "EQ...",
  "txHash": "...",
  "network": "mainnet"
}
```

响应（幂等）：

```json
{
  "ok": true,
  "status": "PENDING_CONFIRM"
}
```

## 6. 限频策略（前端配合）

- 后端规则：单地址 `10s` 内最多 `2` 次本局请求。
- 前端配合：
  - 本地冷却倒计时（避免误触）
  - 命中限频时提示“请求过于频繁，请稍后再试”
  - 不做前端永久封禁，避免误伤

## 7. 主题与适配

- 读取 Telegram 主题变量（深色/浅色）。
- 关键动作按钮保持高对比度。
- 网络慢时显示骨架与进度状态，不阻塞返回键。

## 8. 文案建议（避免敏感词）

- “开始新局”
- “本局投入”
- “预计回报”
- “已结算”
- “返还已入账”
- “邀请奖励”

## 9. 异常提示文案

- 余额不足：`可用余额不足，请调整投入金额`
- 超出上限：`当前可用上限不足，请降低投入金额`
- 系统暂停：`系统维护中，请稍后重试`
- 请求过快：`操作过于频繁，请稍后重试`
- 网络异常：`网络波动，请稍后重试`

## 10. MVP 验收点

- 能在 Bot 内打开并稳定渲染 Mini App
- `MODE_CLEAN` 与 `MODE_GAMING` 路由正确
- 钱包连接、发起交易、交易结果展示完整
- 积分异步入账流程可见且幂等
- 10 秒 2 次限频可观察、可提示
