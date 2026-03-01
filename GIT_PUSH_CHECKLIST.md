# ✅ Git 推送前检查清单

## 🎯 推送前必做的 5 件事

### 1️⃣ 运行安全检查脚本

```bash
cd /Users/feng/Documents/Ton
./check-security.sh
```

**必须看到**：`✅ 安全检查通过！可以推送代码。`

---

### 2️⃣ 查看即将提交的文件

```bash
git status
```

**检查**：
- ❌ 没有 `.env` 文件
- ❌ 没有 `deployment-*.json` 文件
- ❌ 没有 `node_modules/` 目录
- ✅ 只有源代码和配置示例文件

---

### 3️⃣ 查看具体改动

```bash
git diff
```

**确认**：
- ❌ 没有数据库密码
- ❌ 没有 API Key
- ❌ 没有 JWT Secret
- ❌ 没有助记词或私钥
- ✅ 只有代码逻辑改动

---

### 4️⃣ 提交代码

```bash
git add .
git commit -m "描述你的修改"
```

**提交信息建议格式**：

- `feat: 添加新功能` - 新功能
- `fix: 修复 Bug` - Bug 修复
- `docs: 更新文档` - 文档更新
- `style: 代码格式` - 代码格式化
- `refactor: 重构代码` - 代码重构
- `test: 添加测试` - 测试相关
- `chore: 其他改动` - 其他杂项

---

### 5️⃣ 推送到远程仓库

```bash
git push
```

或首次推送：

```bash
git push -u origin main
```

---

## 🚨 如果安全检查失败

### 问题 1: 发现 .env 文件被追踪

**解决方法**：

```bash
# 从 Git 跟踪中移除（保留本地文件）
git rm --cached backend/.env
git rm --cached frontend/.env

# 提交移除操作
git commit -m "chore: Remove .env files from Git"
```

### 问题 2: 发现 deployment-*.json 被追踪

**解决方法**：

```bash
# 移除部署记录文件
git rm --cached deployment-testnet.json
git rm --cached deployment-v2.json

# 提交移除操作
git commit -m "chore: Remove deployment files from Git"
```

### 问题 3: 发现 node_modules 被追踪

**解决方法**：

```bash
# 移除 node_modules
git rm -r --cached node_modules/

# 提交移除操作
git commit -m "chore: Remove node_modules from Git"
```

---

## 📋 完整检查清单

在运行 `git push` 之前，确认以下所有项目：

- [ ] 已运行 `./check-security.sh` 并通过
- [ ] 已查看 `git status`，没有敏感文件
- [ ] 已查看 `git diff`，没有敏感信息
- [ ] 提交信息清晰明确
- [ ] 代码已在本地测试通过
- [ ] 没有 console.log 调试代码（可选）
- [ ] 没有注释掉的大段代码（可选）
- [ ] 已更新相关文档（如果需要）

---

## 🔍 手动快速检查命令

```bash
# 一键检查所有敏感文件
cd /Users/feng/Documents/Ton

echo "=== 检查 .env 文件 ==="
git ls-files | grep -E '\.env$' | grep -v '\.env\.example'

echo "=== 检查部署文件 ==="
git ls-files | grep -E 'deployment-.*\.json$' | grep -v 'deployment\.example'

echo "=== 检查密钥文件 ==="
git ls-files | grep -E '\.(key|pem|p12|pfx)$'

echo "=== 检查 node_modules ==="
git ls-files | grep 'node_modules/' | head -n 5

echo "=== 检查暂存区 ==="
git diff --staged --name-only
```

**如果以上命令都没有输出，说明安全！**

---

## 📝 示例：完整推送流程

```bash
# 1. 进入项目目录
cd /Users/feng/Documents/Ton

# 2. 查看修改状态
git status

# 3. 运行安全检查
./check-security.sh

# 4. 查看具体改动（可选）
git diff

# 5. 添加文件
git add .

# 6. 提交（使用有意义的提交信息）
git commit -m "feat: 添加用户认证功能"

# 7. 推送到远程
git push

# 8. 验证推送成功
git log -1
```

---

## 🆘 紧急情况处理

### 情况 1: 已经推送了敏感信息到 Git

**立即执行**：

1. **不要慌张**
2. **立即修改泄露的密码/密钥**
3. **联系 GitHub 删除缓存**（如果是公开仓库）
4. **使用 BFG 清理历史记录**：

```bash
# 安装 BFG
brew install bfg

# 清理敏感文件
bfg --delete-files .env
bfg --delete-files deployment-testnet.json

# 清理 Git 历史
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 强制推送（危险！）
git push origin --force --all
```

### 情况 2: 不小心提交到错误的分支

```bash
# 撤销最后一次提交（保留修改）
git reset HEAD~1

# 切换到正确的分支
git checkout correct-branch

# 重新提交
git add .
git commit -m "Your message"
git push
```

### 情况 3: 想要撤销已推送的提交

```bash
# 查看提交历史
git log

# 回退到指定提交（替换 COMMIT_HASH）
git revert COMMIT_HASH

# 推送
git push
```

---

## 💡 最佳实践

### 1. 频繁提交，清晰描述

```bash
# ✅ 好的提交
git commit -m "feat: 添加用户登录 API"
git commit -m "fix: 修复游戏结果计算错误"
git commit -m "docs: 更新部署文档"

# ❌ 不好的提交
git commit -m "update"
git commit -m "fix bug"
git commit -m "asdfgh"
```

### 2. 使用分支开发

```bash
# 创建功能分支
git checkout -b feature/new-game-mode

# 开发...

# 提交到功能分支
git push -u origin feature/new-game-mode

# 合并到主分支（通过 PR）
```

### 3. 定期同步远程

```bash
# 拉取最新代码
git pull

# 解决冲突（如果有）
# 编辑冲突文件...

# 提交合并结果
git add .
git commit -m "merge: 合并远程更新"
git push
```

---

## 📞 需要帮助？

- **运行检查脚本**：`./check-security.sh`
- **查看安全指南**：`cat SECURITY_GUIDE.md`
- **查看 Git 帮助**：`git help`

---

**记住：安全第一，永远不要推送敏感信息！** 🔐
