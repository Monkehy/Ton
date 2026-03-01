/**
 * 游戏赔率模拟器
 * 模拟玩家随机押注 10,000 次，计算实际收益率
 */

// ══════════════════════════════════════════════════════════
// 游戏配置（与实际合约一致）
// ══════════════════════════════════════════════════════════

// 赔率配置（BPS = 万分之一）
const PAYOUT_BPS: Record<number, number> = {
  1: 50000,  // 1 个面：5.0x
  2: 28475,  // 2 个面：2.8475x
  3: 19000,  // 3 个面：1.9x
  4: 14263,  // 4 个面：1.4263x
  5: 11420,  // 5 个面：1.142x
};

// House Edge（平台手续费）
const HOUSE_EDGE = 0.02; // 2%
const REBATE = 0.005;    // 0.5% 失败时返还

// ══════════════════════════════════════════════════════════
// 游戏逻辑
// ══════════════════════════════════════════════════════════

/**
 * 计算命中面数
 */
function calcHitCount(direction: "high" | "low", threshold: number): number {
  if (direction === "high") {
    return 7 - threshold; // >=threshold 的面数
  } else {
    return threshold;     // <=threshold 的面数
  }
}

/**
 * 计算赔率
 */
function calcOdds(direction: "high" | "low", threshold: number): number {
  const hitCount = calcHitCount(direction, threshold);
  const payoutBps = PAYOUT_BPS[hitCount] || 19000;
  return payoutBps / 10000;
}

/**
 * 判断是否为必赢组合（无效下注）
 */
function isMustWin(direction: "high" | "low", threshold: number): boolean {
  return (direction === "high" && threshold === 1) || (direction === "low" && threshold === 6);
}

/**
 * 掷骰子（1-6）
 */
function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * 判断是否赢
 */
function checkWin(diceResult: number, direction: "high" | "low", threshold: number): boolean {
  if (direction === "high") {
    return diceResult >= threshold;
  } else {
    return diceResult <= threshold;
  }
}

/**
 * 随机金额（0.1 ~ 10 TON）
 */
function randomBetAmount(): number {
  return Math.random() * (10 - 0.1) + 0.1;
}

/**
 * 随机方向
 */
function randomDirection(): "high" | "low" {
  return Math.random() < 0.5 ? "high" : "low";
}

/**
 * 随机阈值（1-6，排除必赢组合）
 */
function randomThreshold(direction: "high" | "low"): number {
  // 排除必赢组合
  if (direction === "high") {
    // high 时，不能选 1（必赢）
    return Math.floor(Math.random() * 5) + 2; // 2-6
  } else {
    // low 时，不能选 6（必赢）
    return Math.floor(Math.random() * 5) + 1; // 1-5
  }
}

// ══════════════════════════════════════════════════════════
// 模拟
// ══════════════════════════════════════════════════════════

interface SimulationResult {
  totalRounds: number;
  totalBet: number;
  totalWon: number;
  totalLost: number;
  totalRebate: number;
  netProfit: number;
  returnRate: number; // 回报率（玩家视角）
  houseEdge: number;  // 平台收益率
  winRate: number;    // 胜率
  wins: number;
  losses: number;
}

function simulate(rounds: number = 10000): SimulationResult {
  let totalBet = 0;
  let totalWon = 0;
  let totalLost = 0;
  let totalRebate = 0;
  let wins = 0;
  let losses = 0;

  console.log("🎲 开始模拟游戏...\n");

  for (let i = 0; i < rounds; i++) {
    // 随机生成下注参数
    const betAmount = randomBetAmount();
    const direction = randomDirection();
    const threshold = randomThreshold(direction);
    
    // 检查是否有效（不应该出现必赢组合）
    if (isMustWin(direction, threshold)) {
      console.error("❌ 错误：生成了必赢组合！");
      continue;
    }

    // 获取赔率
    const odds = calcOdds(direction, threshold);
    
    // 掷骰子
    const diceResult = rollDice();
    
    // 判断输赢
    const isWin = checkWin(diceResult, direction, threshold);
    
    // 累计统计
    totalBet += betAmount;
    
    if (isWin) {
      // 赢：获得赔付
      const payout = betAmount * odds;
      totalWon += payout;
      wins++;
    } else {
      // 输：损失本金，但获得 rebate
      totalLost += betAmount;
      const rebate = betAmount * REBATE;
      totalRebate += rebate;
      losses++;
    }
  }

  // 计算净收益
  const netProfit = totalWon + totalRebate - totalLost;
  
  // 计算回报率（RTP = Return To Player）
  const returnRate = ((totalWon + totalRebate) / totalBet) * 100;
  
  // 计算平台收益率（House Edge）
  const actualHouseEdge = ((totalBet - totalWon - totalRebate) / totalBet) * 100;
  
  // 计算胜率
  const winRate = (wins / rounds) * 100;

  return {
    totalRounds: rounds,
    totalBet,
    totalWon,
    totalLost,
    totalRebate,
    netProfit,
    returnRate,
    houseEdge: actualHouseEdge,
    winRate,
    wins,
    losses
  };
}

// ══════════════════════════════════════════════════════════
// 显示结果
// ══════════════════════════════════════════════════════════

function displayResults(result: SimulationResult) {
  console.log("═".repeat(60));
  console.log("📊 模拟结果统计");
  console.log("═".repeat(60));
  
  console.log("\n【基本信息】");
  console.log(`  总局数：${result.totalRounds.toLocaleString()} 局`);
  console.log(`  胜场：${result.wins.toLocaleString()} 局`);
  console.log(`  败场：${result.losses.toLocaleString()} 局`);
  console.log(`  胜率：${result.winRate.toFixed(2)}%`);
  
  console.log("\n【资金流水】");
  console.log(`  总投注：${result.totalBet.toFixed(4)} TON`);
  console.log(`  总赢得：${result.totalWon.toFixed(4)} TON`);
  console.log(`  总损失：${result.totalLost.toFixed(4)} TON`);
  console.log(`  Lucky Rebate：${result.totalRebate.toFixed(4)} TON`);
  
  console.log("\n【收益分析】");
  console.log(`  净收益：${result.netProfit > 0 ? '+' : ''}${result.netProfit.toFixed(4)} TON`);
  console.log(`  玩家回报率（RTP）：${result.returnRate.toFixed(2)}%`);
  console.log(`  平台收益率：${result.houseEdge.toFixed(2)}%`);
  
  console.log("\n【结论】");
  if (result.netProfit > 0) {
    console.log(`  ✅ 玩家盈利 ${result.netProfit.toFixed(4)} TON`);
  } else {
    console.log(`  ❌ 玩家亏损 ${Math.abs(result.netProfit).toFixed(4)} TON`);
  }
  
  console.log(`  💡 每投注 100 TON，期望返还 ${result.returnRate.toFixed(2)} TON`);
  console.log(`  💡 每投注 100 TON，期望损失 ${(100 - result.returnRate).toFixed(2)} TON`);
  
  console.log("\n═".repeat(60));
}

// ══════════════════════════════════════════════════════════
// 理论分析
// ══════════════════════════════════════════════════════════

function theoreticalAnalysis() {
  console.log("\n📐 理论期望分析");
  console.log("═".repeat(60));
  
  console.log("\n【各组合的理论 RTP】");
  
  const directions: ("high" | "low")[] = ["high", "low"];
  const thresholds = [1, 2, 3, 4, 5, 6];
  
  let totalRTP = 0;
  let validCombos = 0;
  
  for (const dir of directions) {
    for (const t of thresholds) {
      if (isMustWin(dir, t)) {
        console.log(`  ${dir} ${t}: ❌ 无效（必赢组合）`);
        continue;
      }
      
      const hitCount = calcHitCount(dir, t);
      const odds = calcOdds(dir, t);
      const winProbability = hitCount / 6;
      const loseProbability = 1 - winProbability;
      
      // 期望收益 = 赢的概率 * 赔率 + 输的概率 * rebate
      const expectedReturn = (winProbability * odds) + (loseProbability * REBATE);
      const rtp = expectedReturn * 100;
      
      console.log(`  ${dir} ${t}: 命中${hitCount}面 | 赔率${odds.toFixed(4)}x | 胜率${(winProbability * 100).toFixed(2)}% | RTP ${rtp.toFixed(2)}%`);
      
      totalRTP += rtp;
      validCombos++;
    }
  }
  
  const avgRTP = totalRTP / validCombos;
  console.log(`\n  平均理论 RTP：${avgRTP.toFixed(2)}%`);
  console.log(`  理论 House Edge：${(100 - avgRTP).toFixed(2)}%`);
  
  console.log("\n═".repeat(60));
}

// ══════════════════════════════════════════════════════════
// 运行模拟
// ══════════════════════════════════════════════════════════

console.log("🎰 TON 骰子游戏 - 玩家收益率模拟器");
console.log("═".repeat(60));
console.log("配置：");
console.log(`  - 投注次数：10,000 局`);
console.log(`  - 投注金额：0.1 ~ 10 TON（随机）`);
console.log(`  - 平台手续费：2%`);
console.log(`  - Lucky Rebate：0.5%`);
console.log("═".repeat(60));

// 理论分析
theoreticalAnalysis();

// 运行模拟
const result = simulate(10000);

// 显示结果
displayResults(result);

console.log("\n✅ 模拟完成！\n");
