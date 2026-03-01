# TON-TMA v1 工作安排（合约已部署后）

## 当前状态小结

- **合约**：DiceGame 已部署主网，地址已填入 `backend/.env` 的 `TON_MAINNET_CONTRACT_ADDRESS`。
- **后端**：user/status、score/submit、积分确认 worker、主网 tx 解析（TonAPI）已就绪；`/api/rounds/recent` 目前返回空。
- **前端**：EntryGate 按 mode 路由，NumberLobby 有方向/阈值/金额 UI，但仍是 **demo_wallet + 假 txHash**，未接真实钱包与链上交易。

---

## 优先工作（建议顺序）

### 1. 前端：真实钱包 + 发送 PlayRound 交易（最高优先级）

- **目标**：用户连接钱包后，在 NumberLobby 点「开始新局」时，用 TonConnect 向已部署合约发送 `PlayRound` 交易，拿到真实 `txHash` 再提交给后端。
- **要点**：
  - EntryGate / 全局用 `useTonConnect()` 拿到 `account.address`，请求 `/api/user/status?wallet=xxx` 时传真实钱包地址。
  - NumberLobby 使用同一钱包地址，不再使用 `demo_wallet`。
  - 构建 `PlayRound` 消息：`direction`（0=<=T, 1=>=T）、`threshold`（2–5）、`clientNonce`（如 `Date.now()` 或随机数）。
  - 合约地址从环境变量 `VITE_CONTRACT_ADDRESS` 读取（与后端 `TON_MAINNET_CONTRACT_ADDRESS` 一致）。
  - 使用 TonConnect 的 `sendTransaction` 发送一笔 TON 到合约地址，body 为编码后的 `PlayRound`，金额为用户输入的 `amountTon`。
  - 交易发出后从 TonConnect 拿到 `txHash`（或等确认后的 tx hash），调用 `submitScore(wallet, txHash, 'mainnet')`，并处理 PENDING/CONFIRMED/FAILED 状态与 Toast。
- **配置**：`frontend` 的 TonConnect `manifestUrl` 改为实际可访问的 `tonconnect-manifest.json`（或本机/部署域名下的 manifest 地址）。

### 2. 后端：maxAmountTon 来自合约或配置

- **目标**：`/api/user/status` 中的 `maxAmountTon` 不应写死为 `"12.5000"`，而应根据合约或配置计算。
- **规格**：`maxStake = floor((availablePool * safetyFactor) / worstLossRate)`，其中 `availablePool = max(0, poolBalance - reserveFloor)`。
- **实现**：若合约有 `get_balance` 或等价 getter，后端用 `contractReader` 读池子余额与 `reserveFloor`，按上式算出 `maxStake` 并转为 TON 字符串；若暂无，可先用配置的 `RESERVE_FLOOR_TON` / `SAFETY_FACTOR` 与固定或估算的池余额算一版，并在注释中标明“待合约暴露余额后替换”。

### 3. 后端：pauseState 已来自合约（保持即可）

- 当前 `pauseState` 已用 `contractSnapshot?.paused`，无需改动。

### 4. 可选：/api/rounds/recent 有数据

- **目标**：返回最近若干局摘要（脱敏），便于前端展示「最近对局」。
- **方式一**：后端订阅/轮询链上合约事件（如 `RoundSettled`），解析后写入 `rounds` 表，`/api/rounds/recent` 查该表。
- **方式二**：短期可继续返回空数组，待 M2「事件同步与幂等记分」时一并做。

### 5. 合约侧（可选 / 后续迭代）

- **maxStake 校验**：在合约 `receive(PlayRound)` 内根据当前池余额与 `reserveFloor` 计算 `maxStake`，并 `require(amount <= maxStake)`。
- **autoPause**：当 `poolBalance < reserveFloor` 或 `maxStake < minStake` 时自动置 `paused`，拒绝新局。
- **平台/引荐子账本**：规格中的 `platformAccrual`、`referralAccrual` 等，合约内 TODO 已标注，可放在后续版本。

---

## 与 V1_SPEC 里程碑对应

- **M1**：合约核心状态与赔率、maxStake/autoPause、单测 — 合约已部署，核心逻辑在；maxStake/autoPause 可在合约或后端逐步补齐。
- **M2**：后端事件同步与幂等记分、API 全链路联调、地理与 mode 路由 — 记分与主网确认已有；事件同步可先做前端真实交易，再补 rounds 同步。
- **M3**：Bot 菜单 + TMA 联动、压测与告警、预发布灰度 — 待 M2 联调稳定后推进。

---

## 建议的下一步

1. 做 **前端真实钱包 + PlayRound 发送 + submitScore(txHash)**，完成「连钱包 → 选方向/阈值/金额 → 发交易 → 提交 txHash → 看状态」的闭环。
2. 后端把 **maxAmountTon** 改为按合约/配置计算，避免写死。
3. 拿到 TonAPI key 后填入 `TONAPI_API_KEY`，减少限流。
4. 需要时再补 rounds 事件同步与 `/api/rounds/recent` 数据。

以上可作为当前「合约已部署」后的工作安排；完成第 1、2 项即可形成可用的主网联调闭环。
