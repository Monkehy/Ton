# ✅ 排行榜统计逻辑已修改

## 📊 修改内容

### 修改逻辑
- **"Amount" 排行榜**统计的是每个玩家的**总金额**
- 计算方式：
  - **Win（赢）**：计算赔付金额（`payout_nano`）
  - **Lose（输）**：计算投注金额（`amount_nano`）
  - **总额** = Win 的赔付 + Lose 的投注

### 为什么这样统计？
这反映了玩家在平台上的**总流水金额**：
- 赢的局：玩家获得的赔付
- 输的局：玩家的投注
- 综合反映玩家的活跃度和参与度

## 🔧 修改的文件

### 1. 后端 API (`backend/src/routes/leaderboard.ts`)

```sql
-- 使用 CASE 分别统计 win 和 lose
SELECT 
  wallet, 
  SUM(CASE WHEN result = 1 THEN payout_nano ELSE amount_nano END) AS total_amount
FROM rounds
GROUP BY wallet
ORDER BY total_amount DESC
```

**逻辑**：
- `result = 1`（赢）：累加 `payout_nano`（赔付）
- `result = 0`（输）：累加 `amount_nano`（投注）

### 2. 前端多语言 (`frontend/src/i18n/locales.ts`)

所有语言统一使用 "Amount" 对应的翻译：

| 语言 | 标签名称 | 空状态提示 |
|------|----------|-----------|
| 🇬🇧 英语 | Amount | No amount data |
| 🇪🇸 西班牙语 | Monto | Sin datos de monto |
| 🇧🇷 葡萄牙语 | Montante | Sem dados de montante |
| 🇭🇰 繁体中文 | 總額 | 暫無總額資料 |
| 🇷🇺 俄语 | Сумма | Нет данных по сумме |

### 3. API 调用 (`frontend/src/lib/api.ts`)

- 更新了错误提示文案："总额榜"
- 添加了类型注释说明计算方式

## 💡 示例计算

### 玩家 A
| 局次 | 结果 | 投注 | 赔付 | 计入总额 |
|------|------|------|------|---------|
| 第1局 | Win | 10 TON | 20 TON | **20 TON** |
| 第2局 | Lose | 5 TON | 0 TON | **5 TON** |
| 第3局 | Win | 100 TON | 150 TON | **150 TON** |
| **总计** | | | | **175 TON** |

### 玩家 B
| 局次 | 结果 | 投注 | 赔付 | 计入总额 |
|------|------|------|------|---------|
| 第1局 | Lose | 1000 TON | 0 TON | **1000 TON** |
| 第2局 | Win | 50 TON | 75 TON | **75 TON** |
| **总计** | | | | **1075 TON** |

### 排行榜结果
```
1. 玩家 B: 1075 TON
2. 玩家 A: 175 TON
```

## 🚀 数据库兼容性

✅ **无需数据库迁移**

- 使用现有字段 `amount_nano` 和 `payout_nano`
- 使用现有字段 `result` 区分输赢
- 不需要新增字段或修改表结构

## 📋 测试验证

### SQL 测试查询
```sql
-- 测试查询
WITH agg AS (
  SELECT 
    wallet, 
    SUM(CASE WHEN result = 1 THEN payout_nano ELSE amount_nano END) AS total_amount,
    COUNT(*) AS games_count,
    SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN result = 0 THEN 1 ELSE 0 END) AS losses
  FROM rounds
  GROUP BY wallet
)
SELECT 
  wallet,
  (total_amount / 1000000000.0) AS total_ton,
  games_count,
  wins,
  losses
FROM agg
ORDER BY total_amount DESC
LIMIT 10;
```

### 预期结果验证
- ✅ Win 局应该计入 `payout_nano`
- ✅ Lose 局应该计入 `amount_nano`
- ✅ 按总额从大到小排序
- ✅ 格式化为 TON（保留 4 位小数）

## 🎯 业务意义

这个统计方式反映：

1. **玩家活跃度**：总金额越大，玩得越多
2. **平台流水**：展示哪些玩家贡献的流水最多
3. **综合表现**：不只看输赢，看整体参与度

### 与其他排行榜的区别

| 排行榜 | 统计内容 | 业务意义 |
|--------|---------|---------|
| **Score** | 积分累计 | 玩家等级/成就 |
| **Amount** | Win赔付 + Lose投注 | 平台流水贡献 |

---

## ✅ 总结

- ✅ 后端统计逻辑：Win 计赔付，Lose 计投注
- ✅ 所有语言文案统一为 "Amount"
- ✅ 无需数据库迁移
- ✅ 向后兼容（字段名保持不变）

修改完成！🎉
