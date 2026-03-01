# 💰 TON Testnet 测试币获取指南

## 📋 更新后的余额要求

### ✅ 已降低初始奖池金额

**之前：**
- Testnet: 100 TON
- Mainnet: 1000 TON

**现在（测试阶段）：**
- Testnet: **1 TON** ✨
- Mainnet: **1 TON** ✨

### 💰 部署所需最低余额

| 网络 | 初始奖池 | 部署 Gas | **总计** |
|------|---------|---------|---------|
| Testnet | 1 TON | ~5 TON | **约 6-10 TON** |
| Mainnet | 1 TON | ~5 TON | **约 6-10 TON** |

---

## 🎁 获取 Testnet 测试币

### 方法 1：Telegram Bot（推荐）

#### [@testgiver_ton_bot](https://t.me/testgiver_ton_bot)

1. 打开 Telegram
2. 搜索 `@testgiver_ton_bot`
3. 点击 `/start`
4. 发送你的 testnet 钱包地址（以 `0Q` 或 `kQ` 开头）
5. 每次可领取 **5 TON**
6. 每个地址每 24 小时可领取一次

**示例：**
```
你: 0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns
Bot: ✅ 已发送 5 TON 到你的地址！
```

**领取次数：**
- 你有 3 个 testnet 地址
- 每个地址可领取 5 TON
- 总共可获得：**15 TON** ✅（足够部署）

---

### 方法 2：TON Community Faucet

访问：https://t.me/tondev

1. 加入 TON 开发者社区
2. 发送 `/faucet <你的testnet地址>`
3. 每次可领取约 2-5 TON

---

### 方法 3：TON Testnet Faucet 网页版

访问：https://testnet.tonscan.org/

1. 在搜索框输入你的 testnet 地址
2. 点击页面上的 "Get Test Coins" 按钮
3. 每次约 2 TON

---

## 🔄 具体操作步骤

### 第一步：准备 3 个 Testnet 钱包

你已经有了（在 `deployDirect.ts` 中配置的）：

```
1. 0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns
2. 0QBiscsb5FcPiejE83xO_QsdF2ODzT8d-KlIFyChNlcBVohJ
3. 0QBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJdVe
```

### 第二步：为每个地址领取测试币

打开 [@testgiver_ton_bot](https://t.me/testgiver_ton_bot)：

```
# 第一个地址
发送: 0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns
收到: 5 TON ✅

# 第二个地址
发送: 0QBiscsb5FcPiejE83xO_QsdF2ODzT8d-KlIFyChNlcBVohJ
收到: 5 TON ✅

# 第三个地址
发送: 0QBZ_8MY0xfr4LjjEPnQsdG7YN3cuvlPbBSMNLaIqjcfJdVe
收到: 5 TON ✅
```

**总余额：15 TON** ✅（足够部署！）

### 第三步：确认余额

在 Tonkeeper APP 中查看余额，或访问：
```
https://testnet.tonscan.org/address/0QDQxfvGyvPGDIlgfbdqW0wlNgh8kBqISxAbiJlctIGHxMns
```

---

## 🚀 现在可以部署了！

### 更新后的部署要求

✅ **Testnet 部署**（现在只需要约 10 TON）

```bash
cd /Users/feng/Documents/Ton/contracts
NETWORK=testnet npm run deploy:direct
```

✅ **Mainnet 部署**（现在只需要约 10 TON）

```bash
cd /Users/feng/Documents/Ton/contracts
NETWORK=mainnet npm run deploy:direct
```

---

## 📊 费用明细（更新后）

| 项目 | Testnet | Mainnet |
|------|---------|---------|
| MultiSigColdWallet 部署 | ~0.5 TON | ~0.5 TON |
| PrizePool 部署 | ~0.5 TON | ~0.5 TON |
| DepositVault 部署 | ~0.5 TON | ~0.5 TON |
| DiceGameV2 部署 | ~0.5 TON | ~0.5 TON |
| 初始奖池充值 | **1 TON** | **1 TON** |
| 配置消息 | ~1 TON | ~1 TON |
| **总计** | **约 4-5 TON** | **约 4-5 TON** |

**安全余额建议：10 TON**（留有余量）

---

## ✅ 测试币充足后

```bash
# 1. 检查配置
cd /Users/feng/Documents/Ton/contracts
npm run check:config

# 2. 编译合约
npm run build

# 3. 部署到 testnet
NETWORK=testnet npm run deploy:direct

# 4. 查看部署结果
cat ../deployment-testnet.json
```

---

## 💡 小贴士

1. **先测试一个地址**
   - 先给第一个地址领取 5 TON
   - 用它来部署
   - 确认没问题后再为其他地址充值

2. **24 小时后可再次领取**
   - 如果测试币不够用
   - 等 24 小时后可以再次向 bot 领取

3. **多个 Faucet 组合使用**
   - 如果一个 bot 限额了
   - 可以尝试其他 faucet 渠道

4. **保留一些测试币**
   - 部署后还需要测试交互
   - 建议每个地址至少保留 2-3 TON

---

## ❓ 常见问题

### Q: Bot 说我领取太频繁怎么办？
**A:** 等待 24 小时后再试，或使用其他 faucet。

### Q: 我只有一个地址有测试币，可以部署吗？
**A:** 可以！只需要部署钱包（第一个地址）有余额即可。其他两个地址只是多签配置，可以余额为 0。

### Q: Testnet 测试币会清零吗？
**A:** 不会。Testnet 是持久的测试网络，余额会保留。

### Q: 能直接给我转测试币吗？
**A:** 理论上可以，但建议使用官方 faucet，更快更方便。

---

## 🎯 现在开始

1. ✅ 初始奖池已降低到 **1 TON**
2. ✅ 部署总费用约 **4-5 TON**
3. ✅ 你可以从 [@testgiver_ton_bot](https://t.me/testgiver_ton_bot) 领取测试币
4. ✅ 准备好后运行 `NETWORK=testnet npm run deploy:direct`

**需要的话，我可以继续协助你完成部署！** 🚀
