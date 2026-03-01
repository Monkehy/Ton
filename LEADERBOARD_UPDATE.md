# ✅ 排行榜统计逻辑已修改

## 📊 修改内容

### 之前的逻辑
- **"Won" 排行榜**统计的是**只赢的金额**（`SUM(payout_nano) WHERE result = 1`）
- 只计算玩家赢的局数的赔付金额

### 现在的逻辑
- **"总投注榜"**统计的是**所有投注金额**（`SUM(amount_nano)`，包括 win + lose）
- 计算每个玩家的总投注额，反映玩家的活跃度和参与度

## 🔧 修改的文件

### 1. 后端 API (`backend/src/routes/leaderboard.ts`)

**修改前**：
```sql
SELECT wallet, SUM(payout_nano) AS total_won
FROM rounds
WHERE result = 1  -- 只统计赢的局
GROUP BY wallet
```

**修改后**：
```sql
SELECT wallet, SUM(amount_nano) AS total_bet
FROM rounds  -- 统计所有投注
GROUP BY wallet
```

### 2. 前端多语言 (`frontend/src/i18n/locales.ts`)

| 语言 | 标签页名称 | 空状态提示 |
|------|-----------|-----------|
| 🇬🇧 英语 | Top Wagered | No wager data |
| 🇪🇸 西班牙语 | Mejores apostadores | Sin datos de apuestas |
| 🇧🇷 葡萄牙语 | Maiores apostadores | Sem dados de apostas |
| 🇭🇰 繁体中文 | 總投注榜 | 暫無投注榜資料 |
| 🇷🇺 俄语 | Топ по ставкам | Нет данных по ставкам |

### 3. API 调用 (`frontend/src/lib/api.ts`)

- 更新了错误提示文案："赢的TON榜" → "总投注榜"
- 添加了类型注释说明 `wonTon` 字段现在是总投注额

## 💡 为什么这样改？

### 优点
1. **更全面**：反映玩家的总参与度，而不只是运气
2. **更公平**：活跃玩家会被认可，即使他们输了
3. **更有意义**：展示谁是最大的玩家，而不只是最幸运的

### 例子
假设两个玩家：
- **玩家 A**：投注 100 TON，赢了 50 TON
- **玩家 B**：投注 1000 TON，输了 100 TON

**之前**：玩家 A 排第一（因为赢了 50 TON）  
**现在**：玩家 B 排第一（因为总投注 1000 TON）

## 🚀 数据库兼容性

✅ **无需数据库迁移**

- 使用的是 `rounds` 表中的 `amount_nano` 字段
- 这个字段一直存在，记录每局的投注金额
- 不需要新增字段或修改表结构

## 📋 测试建议

### 1. 测试数据准备
```sql
-- 插入测试数据
INSERT INTO rounds (wallet, amount_nano, result, payout_nano, ...)
VALUES 
  ('wallet_A', 100000000000, 1, 200000000000, ...),  -- 投注 100, 赢 200
  ('wallet_A', 50000000000,  0, 0, ...),             -- 投注 50, 输
  ('wallet_B', 1000000000000, 0, 0, ...),            -- 投注 1000, 输
  ('wallet_B', 100000000000, 1, 150000000000, ...);  -- 投注 100, 赢 150
```

### 2. 预期排行榜结果
```
1. wallet_B: 1100 TON (1000 + 100)
2. wallet_A: 150 TON (100 + 50)
```

### 3. 前端验证
1. 打开历史页面
2. 切换到"总投注榜"标签
3. 确认显示的是总投注额，不是赢的金额
4. 验证排序正确（从大到小）
5. 验证多语言文案正确

## 🔄 回滚方案

如果需要恢复到之前的逻辑，只需要：

1. **后端**：恢复查询条件
   ```sql
   -- 恢复为只统计赢的金额
   SELECT wallet, SUM(payout_nano) AS total_won
   FROM rounds
   WHERE result = 1
   GROUP BY wallet
   ```

2. **前端**：恢复翻译文案
   ```typescript
   tabWon: "Top Winners"  // 英语
   tabWon: "總贏得榜"     // 繁中
   // ... 其他语言
   ```

---

## ✅ 总结

- ✅ 后端统计逻辑已改为总投注额（win + lose）
- ✅ 所有语言的文案已更新
- ✅ 无需数据库迁移
- ✅ 向后兼容（字段名保持不变）

修改完成！🎉
