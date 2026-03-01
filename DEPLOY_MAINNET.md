# TON 主网部署指南（v1）

## 当前状态

- 目前仓库中的 `contracts/DiceGame.tact` 仍是骨架版本。
- 在完成结算逻辑前，不建议直接主网部署。

## 部署前必备

- 主网钱包（有少量 TON 用于部署与手续费）
- 已安装 Node.js 与 npm
- 可用的 TON 合约构建/部署工具链（Blueprint/Tact CLI）
- 后端 `.env` 已配置主网 provider

## 推荐最短流程

1. 完成合约可部署版本（至少补齐结算逻辑与事件）
2. 编译合约并生成部署产物
3. 用主网钱包发送部署交易
4. 记录部署后的合约地址（`EQ...`）
5. 更新后端配置：
   - `CHAIN_PROVIDER=ton_mainnet`
   - `TON_MAINNET_CONTRACT_ADDRESS=<部署后的合约地址>`
   - `TONAPI_BASE_URL=https://tonapi.io`
   - `TONAPI_API_KEY=<可选>`
6. 重启后端服务，开始联调：
   - 发送本局交易
   - 调用 `/api/score/submit`（携带 `network=mainnet`）
   - 观察 `score_ledger` 从 `PENDING_CONFIRM` 变为 `CONFIRMED_SCORED`/`REVERTED`

## 本项目当前一键命令

- 编译合约：`npm run build:contracts`
- 主网部署：`npm run deploy:mainnet`

说明：
- 部署命令会进入交互式钱包选择（Tonkeeper / deep link / Tonhub / 助记词）。
- 需要你在本地终端手动完成钱包确认，命令才能继续。

## 联调建议

- 先用极小金额试运行
- 连续提交同一 `txHash` 验证幂等
- 故意传错误网络参数验证请求拦截
- 配置错误合约地址验证“目标合约不匹配”拦截
