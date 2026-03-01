# 🚀 测试网部署指南

## ✅ 已修复的问题

1. **网络超时**：增加了自动重试机制（3次重试，每次等待20次检查，5秒间隔）
2. **更好的错误处理**：即使超时也会提供合约地址供手动检查
3. **详细的部署日志**：每个步骤都有清晰的状态提示

## 🔧 部署优化

### 自动重试机制
- 每个合约部署失败后会自动重试 3 次
- 每次重试前等待 3 秒
- 每次检查等待 5 秒，最多检查 20 次（总计约 100 秒超时）

### 网络建议
如果测试网仍然响应慢，可以：

1. **使用代理或 VPN**（如果网络受限）
2. **换个时间段部署**（避开高峰期）
3. **手动检查部署状态**：
   ```
   https://testnet.tonscan.org/address/<合约地址>
   ```

## 📝 部署步骤

### 1. 配置管理员地址（重要！）
编辑 `contracts/scripts/deployAll.ts` 第 23-29 行：

```typescript
const MULTISIG_SIGNERS = [
  "EQA...", // 替换为真实的测试网地址 1
  "EQB...", // 替换为真实的测试网地址 2
  "EQC...", // 替换为真实的测试网地址 3
  "EQD...", // 替换为真实的测试网地址 4
  "EQE...", // 替换为真实的测试网地址 5
];
```

**获取测试网地址：**
- 使用 Tonkeeper 或 Tonhub 钱包
- 切换到测试网（Settings → Network → Testnet）
- 复制你的地址

### 2. 调整初始奖池（可选）
对于测试网，可以将初始奖池改小：

```typescript
const INITIAL_PRIZE_POOL_AMOUNT = "10"; // 改为 10 TON（测试用）
```

### 3. 获取测试网代币
访问以下任一水龙头获取测试代币：
- https://t.me/testgiver_ton_bot
- https://faucet.tonscan.org/

**需要金额**：至少 15 TON（测试网）
- 部署 4 个合约：~0.4 TON
- 初始奖池：10 TON
- 配置消息：~0.1 TON
- 预留 gas：~4.5 TON

### 4. 运行部署
```bash
cd /Users/feng/Documents/Ton
npx blueprint run deployAll --testnet
```

### 5. 部署过程
脚本会依次部署：
1. **MultiSigColdWallet** (~30-60秒)
2. **PrizePool** (~30-60秒)
3. **DepositVault** (~30-60秒)  
4. **DiceGameV2** (~30-60秒)
5. 自动配置合约关联
6. 生成配置文件

**总耗时**：约 3-5 分钟（取决于网络）

## ⚠️ 常见问题

### Q1: 仍然超时怎么办？
**A:** 即使超时，合约可能已经部署成功。错误消息会显示合约地址，你可以：
1. 在浏览器中打开：`https://testnet.tonscan.org/address/<地址>`
2. 检查合约状态（Active = 成功）
3. 如果成功，手动记录地址，继续下一个合约

### Q2: 如何单独部署某个合约？
**A:** 你可以创建单独的部署脚本，只部署失败的合约：

```typescript
// contracts/scripts/deployPrizePoolOnly.ts
import { toNano, Address } from "@ton/core";
import { NetworkProvider } from "@ton/blueprint";
import { PrizePool } from "../../build/PrizePool/tact_PrizePool";

export async function run(provider: NetworkProvider) {
  const sender = provider.sender();
  const senderAddress = sender.address!;
  
  const prizePool = provider.open(
    await PrizePool.fromInit(senderAddress, senderAddress)
  );
  
  await prizePool.send(
    provider.sender(),
    { value: toNano("0.1") },
    { $$type: "Deploy", queryId: 0n }
  );
  
  await provider.waitForDeploy(prizePool.address, 30, 5000);
  console.log("PrizePool:", prizePool.address.toString());
}
```

运行：`npx blueprint run deployPrizePoolOnly --testnet`

### Q3: 部署成功后如何验证？
**A:** 检查生成的文件：
- `deployment-v2.json` - 所有合约地址
- `deployment-v2.env` - 环境变量配置

然后访问 testnet.tonscan.org 查看每个合约：
```bash
# 查看部署信息
cat deployment-v2.json
```

### Q4: 如果某个合约部署失败了？
**A:** 不要重新运行整个脚本！可以：
1. 修改脚本注释掉已成功的合约
2. 或创建单独的部署脚本只部署失败的
3. 手动更新 `deployment-v2.json`

## 📊 部署进度跟踪

使用这个检查清单：

- [ ] MultiSigColdWallet 部署成功
- [ ] PrizePool 部署成功
- [ ] PrizePool 充值 10 TON
- [ ] DepositVault 部署成功
- [ ] DiceGameV2 部署成功
- [ ] PrizePool.SetGameContract 发送成功
- [ ] DepositVault.SetGameContract 发送成功
- [ ] deployment-v2.json 已生成
- [ ] deployment-v2.env 已生成

## 🎯 下一步

部署成功后：

1. **更新环境变量**
   ```bash
   # 复制地址到前端
   cp deployment-v2.env frontend/.env
   
   # 复制地址到后端
   cp deployment-v2.env backend/.env
   ```

2. **测试合约**
   - 尝试充值到 DepositVault
   - 玩一局游戏
   - 测试提现

3. **监控合约**
   - 在 testnet.tonscan.org 查看交易
   - 检查事件日志
   - 确认资金流转正确

## 💡 小贴士

- **保存部署日志**：将终端输出复制保存，包含所有合约地址
- **备份私钥**：测试网钱包私钥也要妥善保管
- **记录问题**：如遇到问题，记录错误信息和合约地址

---

祝部署顺利！ 🚀

如有问题，查看 `ARCHITECTURE_V2.md` 了解架构详情。
