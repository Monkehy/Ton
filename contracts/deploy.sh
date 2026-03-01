#!/bin/bash

# TON 合约快速部署脚本
# 使用方法：./deploy.sh testnet 或 ./deploy.sh mainnet

set -e

NETWORK="${1:-testnet}"

if [ "$NETWORK" != "testnet" ] && [ "$NETWORK" != "mainnet" ]; then
    echo "❌ 错误：网络参数必须是 testnet 或 mainnet"
    echo "使用方法：./deploy.sh testnet 或 ./deploy.sh mainnet"
    exit 1
fi

echo "🚀 TON V2 架构部署脚本"
echo "═══════════════════════════════════════════════════════════"
echo "目标网络：$NETWORK"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 编译合约
echo "📦 编译合约..."
npm run build

echo ""
echo "✅ 编译完成"
echo ""

# 部署
echo "🚀 开始部署到 $NETWORK..."
echo ""

NETWORK=$NETWORK npm run deploy:direct

echo ""
echo "✅ 部署完成！"
echo ""
echo "📄 部署信息已保存到：deployment-$NETWORK.json"
echo ""
echo "下一步："
echo "  1. 查看部署结果：cat deployment-$NETWORK.json"
echo "  2. 更新前端配置：frontend/.env"
echo "  3. 更新后端配置：backend/.env"
echo ""
