#!/bin/bash
# ========================================
# Git 推送前安全检查脚本
# ========================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  🔐 Git 推送前安全检查"
echo "=========================================="
echo ""

FOUND_ISSUES=0

# ========================================
# 检查 1: .env 文件
# ========================================
echo "🔍 检查 .env 文件..."
ENV_FILES=$(git ls-files | grep -E '\.env$' | grep -v '\.env\.example' || true)

if [ -n "$ENV_FILES" ]; then
  echo -e "${RED}❌ 发现 .env 文件被追踪：${NC}"
  echo "$ENV_FILES"
  echo ""
  echo "解决方法："
  echo "  git rm --cached backend/.env"
  echo "  git rm --cached frontend/.env"
  FOUND_ISSUES=1
else
  echo -e "${GREEN}✅ 未发现 .env 文件${NC}"
fi

echo ""

# ========================================
# 检查 2: 部署配置文件
# ========================================
echo "🔍 检查部署配置文件..."
DEPLOYMENT_FILES=$(git ls-files | grep -E 'deployment-.*\.json$' | grep -v 'deployment\.example\.json' || true)

if [ -n "$DEPLOYMENT_FILES" ]; then
  echo -e "${RED}❌ 发现部署配置文件被追踪：${NC}"
  echo "$DEPLOYMENT_FILES"
  echo ""
  echo "解决方法："
  echo "  git rm --cached deployment-testnet.json"
  echo "  git rm --cached deployment-v2.json"
  FOUND_ISSUES=1
else
  echo -e "${GREEN}✅ 未发现部署配置文件${NC}"
fi

echo ""

# ========================================
# 检查 3: 密钥文件
# ========================================
echo "🔍 检查密钥文件..."
KEY_FILES=$(git ls-files | grep -E '\.(key|pem|p12|pfx)$' || true)

if [ -n "$KEY_FILES" ]; then
  echo -e "${RED}❌ 发现密钥文件被追踪：${NC}"
  echo "$KEY_FILES"
  echo ""
  echo "解决方法："
  echo "  git rm --cached <文件路径>"
  FOUND_ISSUES=1
else
  echo -e "${GREEN}✅ 未发现密钥文件${NC}"
fi

echo ""

# ========================================
# 检查 4: 数据库备份
# ========================================
echo "🔍 检查数据库备份文件..."
DB_FILES=$(git ls-files | grep -E '\.(sql|dump|db|sqlite)$' || true)

if [ -n "$DB_FILES" ]; then
  echo -e "${RED}❌ 发现数据库文件被追踪：${NC}"
  echo "$DB_FILES"
  echo ""
  echo "解决方法："
  echo "  git rm --cached <文件路径>"
  FOUND_ISSUES=1
else
  echo -e "${GREEN}✅ 未发现数据库文件${NC}"
fi

echo ""

# ========================================
# 检查 5: 暂存区内容
# ========================================
echo "🔍 检查 Git 暂存区..."
STAGED_FILES=$(git diff --staged --name-only | grep -E '\.(env|key|pem|json)$' || true)

if [ -n "$STAGED_FILES" ]; then
  echo -e "${YELLOW}⚠️  暂存区中有以下敏感文件：${NC}"
  echo "$STAGED_FILES"
  echo ""
  echo "请仔细检查这些文件内容，确保没有敏感信息！"
  echo ""
  
  # 检查是否包含明显的敏感信息
  for file in $STAGED_FILES; do
    if [ -f "$file" ]; then
      if grep -qE '(password|secret|private.*key|mnemonic|jwt.*secret|api.*key|DATABASE_URL.*@)' "$file" 2>/dev/null; then
        echo -e "${RED}❌ 文件 $file 可能包含敏感信息！${NC}"
        FOUND_ISSUES=1
      fi
    fi
  done
fi

echo ""

# ========================================
# 检查 6: node_modules
# ========================================
echo "🔍 检查 node_modules..."
NODE_MODULES=$(git ls-files | grep 'node_modules/' | head -n 1 || true)

if [ -n "$NODE_MODULES" ]; then
  echo -e "${RED}❌ 发现 node_modules 被追踪${NC}"
  echo ""
  echo "解决方法："
  echo "  git rm -r --cached node_modules/"
  FOUND_ISSUES=1
else
  echo -e "${GREEN}✅ node_modules 未被追踪${NC}"
fi

echo ""

# ========================================
# 检查 7: 大文件
# ========================================
echo "🔍 检查大文件..."
LARGE_FILES=$(git ls-files | xargs -I {} du -h {} 2>/dev/null | awk '$1 ~ /[0-9]+M/ {print $0}' | head -n 5 || true)

if [ -n "$LARGE_FILES" ]; then
  echo -e "${YELLOW}⚠️  发现大文件（>1MB）：${NC}"
  echo "$LARGE_FILES"
  echo ""
  echo "建议使用 Git LFS 管理大文件"
fi

echo ""

# ========================================
# 总结
# ========================================
echo "=========================================="

if [ $FOUND_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✅ 安全检查通过！可以推送代码。${NC}"
  echo "=========================================="
  echo ""
  echo "建议的推送命令："
  echo "  git push"
  exit 0
else
  echo -e "${RED}❌ 发现安全问题！请修复后再推送。${NC}"
  echo "=========================================="
  echo ""
  echo "修复步骤："
  echo "  1. 从 Git 中移除敏感文件：git rm --cached <文件>"
  echo "  2. 确认 .gitignore 配置正确"
  echo "  3. 重新运行此检查脚本"
  echo "  4. 提交更改：git commit -m 'Remove sensitive files'"
  echo "  5. 推送代码：git push"
  exit 1
fi
