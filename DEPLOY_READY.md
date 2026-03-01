# ✅ 问题已解决 - 一键部署就绪

## 编译成功 ✓

所有 4 个合约已成功编译：
- ✅ DepositVault
- ✅ PrizePool  
- ✅ MultiSigColdWallet（已修复嵌套 map 问题）
- ✅ DiceGameV2

## 快速开始

### 1. 配置管理员地址

编辑 `scripts/deployAll.ts` 第 19-25 行，替换 5 个管理员地址：

```typescript
const MULTISIG_SIGNERS = [
  "EQA...", // 改成真实地址
  "EQB...", // 改成真实地址
  "EQC...", // 改成真实地址
  "EQD...", // 改成真实地址
  "EQE...", // 改成真实地址
];
```

### 2. 一键部署

```bash
# 测试网部署
npx blueprint run deployAll --testnet

# 或主网部署（测试完成后）
npx blueprint run deployAll --mainnet
```

### 3. 查看结果

部署完成后会生成：
- `deployment-v2.json` - 部署详情
- `deployment-v2.env` - 环境变量配置（直接复制到 `.env`）

## 部署费用

- Gas 费：~0.2 TON
- 奖池充值：1000 TON
- **总计：1000.2 TON**

## 已修复的问题

✅ 修正了 Blueprint 期望的目录结构（`scripts/` 和 `wrappers/` 在项目根目录）  
✅ 修正了 import 路径（指向 `contracts/build/`）  
✅ 修正了 wrapper 的 tact 文件路径（`contracts/*.tact`）  
✅ 简化了 MultiSigColdWallet（避免 Tact 不支持的嵌套 map）  

## 下一步

1. 配置管理员地址
2. 运行部署命令
3. 复制 `deployment-v2.env` 到前后端
4. 测试流程

详细说明见 `ONE_CLICK_DEPLOY.md`
