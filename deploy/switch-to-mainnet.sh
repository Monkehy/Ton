#!/bin/bash

# ============================================
# 切换到 Mainnet 配置
# 运行此脚本将部署脚本切换为 Mainnet 模式
# ============================================

DEPLOY_SCRIPT="/Users/feng/Documents/Ton/deploy/deploy.sh"

echo "🔄 切换部署配置到 Mainnet..."

# 备份原文件
cp $DEPLOY_SCRIPT ${DEPLOY_SCRIPT}.testnet.backup

# 替换为 Mainnet 配置
sed -i '' 's/CHAIN_PROVIDER=ton_testnet/CHAIN_PROVIDER=ton_mainnet/g' $DEPLOY_SCRIPT
sed -i '' 's|https://testnet.tonapi.io|https://tonapi.io|g' $DEPLOY_SCRIPT
sed -i '' 's|https://testnet.toncenter.com/api/v2/jsonRPC|https://toncenter.com/api/v2/jsonRPC|g' $DEPLOY_SCRIPT
sed -i '' 's/VITE_NETWORK=testnet/VITE_NETWORK=mainnet/g' $DEPLOY_SCRIPT

# 提示用户更新合约地址
echo ""
echo "✅ 配置已切换到 Mainnet"
echo ""
echo "⚠️  重要：请手动更新以下内容："
echo ""
echo "1. 编辑 deploy/deploy.sh"
echo "2. 将合约地址替换为 Mainnet 地址："
echo ""
echo "   TON_MAINNET_CONTRACT_ADDRESS=YOUR_MAINNET_DICEGAME_ADDRESS"
echo "   TON_DEPOSIT_VAULT_ADDRESS=YOUR_MAINNET_DEPOSITVAULT_ADDRESS"
echo "   TON_PRIZE_POOL_ADDRESS=YOUR_MAINNET_PRIZEPOOL_ADDRESS"
echo ""
echo "3. 运行部署脚本"
echo ""

# 显示需要修改的行
echo "📝 需要修改的行："
grep -n "TON_.*_ADDRESS" $DEPLOY_SCRIPT | head -3
echo ""
