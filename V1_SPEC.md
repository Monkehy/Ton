# TON-TMA 项目 v1 规格文档（Bot + Mini App）

## 1. 目标与边界

### 1.1 项目目标
- 以 Telegram Bot + Mini App 形式提供数字区间预测玩法。
- 链上结算、可审计、可暂停、可恢复。
- 长期平台边际目标：`4.75%`（统计口径见 2.4）。

### 1.2 技术边界（最终版）
- 公链：TON。
- 合约语言：Tact。
- 前端：React + Vite + Tailwind + `@tonconnect/ui-react` + Telegram WebApp SDK。
- 后端：Node.js（Fastify）+ PostgreSQL。
- 随机数：TON 原生随机流程（`native_prepare_random()` + 承诺式事件记录）。

### 1.3 与需求冲突项的结论
- `Chainlink VRF`：不作为 TON 主网 v1 的默认方案（跨链依赖高、复杂度和成本不适合 MVP）。
- `MetaMask` 无感连接：不适用于 TON 主路径；v1 使用 TonConnect 兼容 TON 钱包。
- 无注册：可以实现。身份以 Telegram `initData` + TON 地址联合识别。

---

## 2. 经济模型与赔率（v1 冻结）

### 2.1 每局参数定义
- 本局投入：`S`
- 命中概率：`p = 命中面数 / 6`
- 平台目标边际：`m = 0.0475`
- 失败返还比例：`r = 0.005`
- 胜利总回款倍率（含本金）：`M(p)`

### 2.2 统一公平口径（保证不同概率下边际一致）

为保证所有选项长期边际一致为 `4.75%`，采用：

`M(p) = (1 - m - (1 - p) * r) / p`

玩家单局期望回款率：

`EV = p * M(p) + (1 - p) * r = 1 - m = 0.9525`

即平台长期边际固定为 `4.75%`。

### 2.3 数字区间玩法与赔率表（1~6）

玩家每局选择：
- 方向：`>= T` 或 `<= T`
- 阈值：`T ∈ [1, 6]`

命中概率：
- 常规：`P(>=T) = (7 - T)/6`，`P(<=T) = T/6`
- 边界修正（防必胜）：
  - 当 `T=1` 且方向为“猜大”时，命中集合改为 `2~6`，即 `P=5/6`（不包含 1）
  - 当 `T=6` 且方向为“猜小”时，命中集合改为 `1~5`，即 `P=5/6`（不包含 6）

对应赔率（四舍五入到小数点后 4 位，实际链上建议用整数分母表示）：

| 方向 | 阈值 T | 命中概率 p | 胜利总回款倍率 M(p) |
|---|---:|---:|---:|
| `<=` | 1 | 1/6 | 5.6900 |
| `<=` | 2 | 2/6 | 2.8475 |
| `<=` | 3 | 3/6 | 1.9000 |
| `<=` | 4 | 4/6 | 1.4263 |
| `<=` | 5 | 5/6 | 1.1420 |
| `<=` | 6 | 5/6（边界修正） | 1.1420 |
| `>=` | 1 | 5/6（边界修正） | 1.1420 |
| `>=` | 2 | 5/6 | 1.1420 |
| `>=` | 3 | 4/6 | 1.4263 |
| `>=` | 4 | 3/6 | 1.9000 |
| `>=` | 5 | 2/6 | 2.8475 |
| `>=` | 6 | 1/6 | 5.6900 |

说明：
- 你提出的“`1 猜大` 与 `6 猜小` 必须排除边界值本身”已落地。
- 因为两者命中概率同为 `5/6`，对应倍率一致（都为 `1.1420`）。
- 极端概率（如 `p=1`）会出现 `<1` 的倍率。  
- v1 运行规则冻结为：随机结果始终为 `1~6`，但用户可选阈值仅开放 `T ∈ {2,3,4,5}`。

### 2.4 抽成与分润记账口径
- 你最终确认口径为 `4%` 抽成框架：平台 `3%` + 引荐 `1%（有引荐时）`。
- 为保证统一边际 `4.75%`，v1 使用“总池记账 + 子账本”：
  - 主池：统一收付。
  - 子账本：`platformAccrual`、`referralAccrual[referrer]`、`rebatePaid`。
- 子账本用于核算与提现顺序控制，不要求每局外发。
- 当“实际胜率分布”与理论分布偏离时，短期边际会波动；长期统计回归 `4.75%`。

---

## 3. 奖池安全与可提取规则

### 3.1 关键参数
- `minStake = 0.1 TON`
- `reserveFloor = 1000 TON`（动态可调）
- `safetyFactor = 0.02`（可治理调整）
- `availablePool = max(0, poolBalance - reserveFloor)`
- `worstLossRate`：
  - 记账外发（推荐）：`0.96`
  - 即时外发：`1.00`

### 3.2 最大单局金额

`maxStake = floor((availablePool * safetyFactor) / worstLossRate)`

约束：
- 合约内计算并校验，前端仅展示，不能作为信任源。
- 每次调用都实时读取当前池余额与参数。

### 3.3 自动暂停机制（可执行替代“owner 义务补池”）
- 触发条件：`poolBalance < reserveFloor` 或 `maxStake < minStake`。
- 行为：`autoPause = true`，拒绝新局请求，保留查询与提现路径。
- 恢复条件：owner 补充池子并手动 `resume()`。

### 3.4 提现优先级（按你确认）
1. 玩家赔付（胜利回款）
2. 玩家可提余额（若有异步结算）
3. 引荐可提余额
4. owner 可提余额

---

## 4. 合约状态机与异常处理（Tact）

### 4.1 主状态
- `ACTIVE`：可受理新局。
- `PAUSED`：不可受理新局，可执行管理与查询。
- `EMERGENCY`：仅允许必要恢复操作。

### 4.2 每局生命周期
`CREATED -> RNG_PREPARED -> RESOLVED -> SETTLED`

### 4.3 异常场景处理
- 随机准备失败：本局标记 `FAILED_RNG`，原额退回。
- 消息超时：进入 `PENDING_TIMEOUT`，允许补偿任务重试；超过阈值转人工恢复。
- 外发失败：不回滚主结果，记入 `claimableBalance` 由用户主动提取。
- 余额不足：拒绝创建新局并触发 `autoPause`。

### 4.4 事件日志（证据链）
每局必须写事件：
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

---

## 5. 后端（Fastify + PostgreSQL）

### 5.1 核心职责
- 验证 Telegram `initData`。
- 同步链上事件并入库。
- 积分记账与等级计算。
- 地理与风控判定（仅做路由/展示层策略，不作为链上结算条件）。

### 5.2 API（v1）
- `GET /api/user/status`
  - 输入：`telegramUserId`、`wallet`
  - 输出：`level`, `score`, `mode`, `pauseState`, `maxStake`
- `POST /api/referral/bind`
  - 输入：`wallet`, `referrerWallet`, `signature`
  - 规则：一经绑定不可改；自引荐拒绝。
- `POST /api/score/submit`
  - 输入：`wallet`, `txHash`
  - 规则：仅提交，不立即加分；由确认任务异步入账。
- `GET /api/rounds/recent`
  - 返回最近局摘要（脱敏）。

### 5.3 积分确认深度（建议）
- 采用 `N=1` 最终确认后记分（TON 实际上最终性较快，MVP 建议先 `N=1`，后续可升到 `N=2`）。
- 计分规则（已冻结）：
  - 若本局投入 `< 1 TON`：`scoreDelta = 0`
  - 若本局投入 `>= 1 TON`：`scoreDelta = amountTon * 0.1`
  - 示例：`10 TON => 1.0` 积分
- 状态：
  - `PENDING_CONFIRM`
  - `CONFIRMED_SCORED`
  - `REVERTED`
  - `DUPLICATE_IGNORED`
- 重复 `txHash` 返回 200 + 幂等结果，不报错。

### 5.4 幂等与反刷分
- 唯一键：`(chain, txHash, wallet)`。
- 仅接受链上可验证且与目标合约地址匹配的交易。
- 仅对有效回执且状态成功的交易计分。

---

## 6. 地理判定容错方案（Cf-IPCountry + geoip-lite）

### 6.1 判定优先级
1. `Cf-IPCountry`（若接入层可信并启用）
2. 服务端源 IP + `geoip-lite`
3. Telegram 环境信息（仅辅助，不作为单独依据）

### 6.2 容错策略
- `UNKNOWN` 国家码默认进入 `MODE_CLEAN`（保守策略）。
- 当 `Cf-IPCountry` 与 `geoip-lite` 冲突：
  - 标记 `GEO_CONFLICT`，
  - 默认 `MODE_CLEAN`，
  - 写审计日志供后续人工/规则调整。
- 对短时间频繁切换国家码的地址，进入观察名单并降级到 `MODE_CLEAN`。

### 6.3 回退与可观测
- 所有地理判定输出 `modeReason` 字段。
- 增加指标：
  - `geo_unknown_rate`
  - `geo_conflict_rate`
  - `mode_clean_ratio`

---

## 7. 并发与吞吐设计（Bot + TMA）

### 7.1 现实目标分层
- 链上实时逐笔结算不适合直接承载“每秒 1 万并发”。
- v1 建议目标：
  - 前端请求层：可扩到高并发（CDN + 无状态 API）。
  - 链上结算层：按链上吞吐能力限流、排队、分批确认。

### 7.2 可执行架构
- 接入层：Bot Webhook + API 网关（限流）。
- 任务层：消息队列（Round Request Queue）。
- 结算层：有序 worker（保证同一玩家请求顺序）。
- 展示层：实时推送“已接收/处理中/已结算”状态。

### 7.3 风控阈值（后端）
- 单地址频率限制（已冻结）：`10` 秒内最多 `2` 次请求。
- 单区块提交次数限制：超出进入队列。
- 异常地址冻结观察：仅冻结前端入口，不影响其链上资产所有权。

---

## 8. 前端（Mini App）规范

### 8.1 模式路由
- `MODE_CLEAN`：展示 `CleanSnakeGame`。
- `MODE_GAMING`：展示 `DiceLobby`（建议改名为 `NumberLobby`，避免敏感词）。

### 8.2 交互状态
- `IDLE`
- `WALLET_CONNECTING`
- `TX_SENDING`
- `TX_PENDING`
- `TX_CONFIRMED`
- `TX_FAILED`

### 8.3 无注册连接
- 首次打开即读取 Telegram 用户态。
- 使用 TonConnect 连接钱包。
- 不要求邮箱/手机号注册。

---

## 9. 数据表（PostgreSQL 简版）

- `users(id, telegram_id, wallet, referrer_wallet, created_at)`
- `rounds(round_id, wallet, direction, threshold, amount, roll, result, payout, rebate, tx_hash, status, created_at)`
- `score_ledger(id, wallet, tx_hash, score_delta, confirm_status, created_at)`
- `referral_ledger(id, referrer_wallet, round_id, amount, withdrawable, created_at)`
- `platform_ledger(id, round_id, amount, withdrawable, created_at)`
- `risk_flags(id, wallet, flag_type, reason, expire_at, created_at)`

索引建议：
- `rounds(wallet, created_at desc)`
- `score_ledger(tx_hash, wallet)` unique
- `users(wallet)` unique

---

## 10. 命名与文案约束

- 产品内避免使用敏感术语。
- 推荐术语：
  - `Round`（局）
  - `Amount`（投入）
  - `Reward`（回报）
  - `Rebate`（返还）
  - `Referral`（引荐）
  - `Pool`（资金池）

---

## 11. v1 开发里程碑

### M1（第 1 周）
- 完成合约核心状态与赔率常量。
- 完成 `maxStake` 与 `autoPause`。
- 输出合约单测（胜负、边界、异常）。

### M2（第 2 周）
- 后端事件同步与幂等记分上线。
- API 全链路联调。
- 地理容错与 mode 路由上线。

### M3（第 3 周）
- Bot 菜单 + TMA 页面联动。
- 压测与告警上线。
- 预发布灰度。

---

## 12. 上线前检查清单（必须全部通过）

- [ ] 合约参数（`reserveFloor`, `safetyFactor`, `minStake`, `maxStake`）可查询可审计。
- [ ] 任意异常路径不丢资产：外发失败可提取。
- [ ] 幂等生效：重复提交 `txHash` 不重复记分。
- [ ] `autoPause` 在低余额下可自动触发并可恢复。
- [ ] 事件日志完整，可按 `roundId` 复盘。
- [ ] 前端深浅色模式与 Telegram 容器适配通过。

---

## 13. 已冻结运行参数（v1）

1. `minStake = 0.1 TON`  
2. `reserveFloor = 1000 TON`  
3. `safetyFactor = 0.02`  
4. 用户可选阈值集合：`{2,3,4,5}`（随机结果仍为 `1~6`）  
5. 积分规则：`amount < 1 TON => 0`；`amount >= 1 TON => amountTon * 0.1`  
6. 单地址限频：`10 秒内最多 2 次`  

上述参数已作为 v1 实施基线，可进入代码实现阶段（合约 -> 后端 -> 前端联调）。
