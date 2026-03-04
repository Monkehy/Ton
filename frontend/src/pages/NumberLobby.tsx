import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { toNano } from "@ton/core";
import { fetchUserStatus, fetchRecentTransactions, submitScore, submitRound, DEV_MOCK_WALLET } from "../lib/api";
import {
  buildDepositPayload,
  buildPlayRoundPayload,
  buildWithdrawBalancePayload,
  buildClaimPayload
} from "../lib/playRound";
import { ResultModal } from "../components/ResultModal";
import { useT } from "../i18n/LocaleContext";

const DEV_MOCK = Boolean(DEV_MOCK_WALLET);
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_WAIT_MS = 90_000;
const MIN_PLAY_TON = 0.1;
const ROLL_DURATION_MS = 3000;

// 1-face hit (threshold=6 high / threshold=1 low) uses special 5.0x odds
const PAYOUT_BPS: Record<number, number> = { 1: 50000, 2: 28475, 3: 19000, 4: 14263, 5: 11420 };
function calcHitCount(dir: "high" | "low", t: number) {
  if (dir === "high") return 7 - t;   // t=1→6, t=6→1
  return t;                            // t=1→1, t=6→6
}
// Returns null for impossible (must-win) combos
function calcOdds(dir: "high" | "low", t: number): string | null {
  const hc = calcHitCount(dir, t);
  if (hc >= 6) return null; // must-win, disallow
  return ((PAYOUT_BPS[hc] ?? 19000) / 10000).toFixed(2);
}
function isMustWin(dir: "high" | "low" | null, t: number) {
  if (!dir) return false;
  return (dir === "high" && t === 1) || (dir === "low" && t === 6);
}

interface RoundResult {
  win: boolean;
  roll: number;
  direction: "high" | "low";
  threshold: number;
  amountTon: string;
  odds: string;
  payoutTon: string;
  rebateTon: string;
}

export interface NumberLobbyProps {
  wallet: string;
  contractAddress?: string;
  balanceTon: string;
  claimableTon: string;
  maxAmountTon?: string;
  onBalanceChange: (val: string) => void;
  onClaimableChange: (val: string) => void;
}

export function NumberLobby({
  wallet,
  contractAddress,
  balanceTon,
  claimableTon,
  maxAmountTon,
  onBalanceChange,
  onClaimableChange
}: NumberLobbyProps) {
  const contract = contractAddress ?? CONTRACT_ADDRESS;
  const maxBet = Number(maxAmountTon) || Infinity;
  const [tonConnectUI] = useTonConnectUI();
  const { t } = useT();

  const [threshold, setThreshold] = useState(3);
  const [displayNum, setDisplayNum] = useState(3);
  const [amountTon, setAmountTon] = useState("0.5");
  const [selectedDir, setSelectedDir] = useState<"high" | "low" | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [txError, setTxError] = useState("");
  const [result, setResult] = useState<RoundResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const pendingResult = useRef<RoundResult | null>(null);

  const balanceNum = useMemo(() => Number(balanceTon), [balanceTon]);
  const inputAmount = useMemo(() => Number(amountTon), [amountTon]);
  const isAmountValid = Number.isFinite(inputAmount) && inputAmount >= MIN_PLAY_TON;
  const hasEnoughBalance = balanceNum >= inputAmount;
  const mustWin = isMustWin(selectedDir, threshold);
  const canStart = Boolean(
    (DEV_MOCK || contract) && wallet && isAmountValid && hasEnoughBalance && selectedDir && !isRolling && !mustWin
  );

  // ── Slider fill ──
  function sliderStyle(val: number) {
    const pct = ((val - 1) / 5) * 100;
    return `linear-gradient(to right, var(--accent) ${pct}%, var(--surface2) ${pct}%)`;
  }

  function handleSliderChange(raw: number) {
    if (isRolling) return;
    setDisplayNum(raw);
    setThreshold(raw);
  }

  function selectThreshold(val: number) {
    if (isRolling) return;
    setThreshold(val);
    setDisplayNum(val);
  }

  function selectDir(dir: "high" | "low") {
    if (isRolling) return;
    setSelectedDir(dir);
  }

  // ── Rolling animation ──
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRollingAnimation = useCallback((onDone: (roll: number) => void) => {
    setIsRolling(true);
    const started = Date.now();

    function tick() {
      const elapsed = Date.now() - started;
      if (elapsed >= ROLL_DURATION_MS) {
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setDisplayNum(finalRoll);
        setIsRolling(false);
        onDone(finalRoll);
        return;
      }
      const progress = elapsed / ROLL_DURATION_MS;
      const interval = 55 + progress * 200;
      const r = Math.floor(Math.random() * 6) + 1;
      setDisplayNum(r);
      rollTimerRef.current = setTimeout(tick, interval);
    }
    tick();
  }, []);

  useEffect(() => () => { if (rollTimerRef.current) clearTimeout(rollTimerRef.current); }, []);

  // ── Poll & submit (real chain) ──
  async function pollAndSubmitScore() {
    let lastLt = 0;
    try {
      const { transactions } = await fetchRecentTransactions(contract, wallet);
      lastLt = Math.max(0, ...transactions.map((t) => t.lt ?? 0));
    } catch { /* use 0 */ }
    const deadline = Date.now() + POLL_MAX_WAIT_MS;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const { transactions } = await fetchRecentTransactions(contract, wallet);
        const newer = transactions.find((t) => (t.lt ?? 0) > lastLt);
        if (newer?.hash) {
          await submitScore(wallet, newer.hash, "mainnet");
          return true;
        }
      } catch { /* continue */ }
    }
    return false;
  }

  // ── Start round ──
  async function handleStartRound() {
    if (!canStart || !selectedDir) return;
    setTxError("");
    const dir = selectedDir;
    const amt = parseFloat(amountTon) || 0.5;
    const odds = calcOdds(dir, threshold) ?? "5.00";

    if (DEV_MOCK) {
      startRollingAnimation((roll) => {
        const win = dir === "high" ? roll >= threshold : roll <= threshold;
        const amountNano = toNano(String(amt));
        const hc = calcHitCount(dir, threshold);
        const bps = win ? (PAYOUT_BPS[hc] ?? 50000) : 0;
        const payoutNano = win ? (amountNano * BigInt(bps)) / 10000n : 0n;
        const rebateNano = win ? 0n : (amountNano * 50n) / 10000n;
        const payoutTon = (Number(payoutNano) / 1e9).toFixed(4);
        const rebateTon = (Number(rebateNano) / 1e9).toFixed(4);

        const r: RoundResult = { win, roll, direction: dir, threshold, amountTon: String(amt), odds, payoutTon, rebateTon };
        pendingResult.current = r;
        setResult(r);
        setShowResult(true);

        void submitRound({
          wallet, direction: dir === "high" ? 1 : 0, threshold,
          amountNano: amountNano.toString(), roll, result: win ? 1 : 0,
          payoutNano: payoutNano.toString(), rebateNano: rebateNano.toString()
        });
      });
      return;
    }

    // Real chain flow: send tx first, then roll animation concurrently
    const dirNum: 0 | 1 = dir === "low" ? 0 : 1;
    const amountNano = toNano(String(amt));
    const payload = buildPlayRoundPayload(dirNum, threshold, amountNano, Math.floor(Date.now() / 1000));
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        // 0.05 TON gas: forwarded through DiceGameV2 → DepositVault → PrizePool
        messages: [{ address: contract, amount: toNano("0.05").toString(), payload }]
      });
    } catch (e) {
      setTxError(e instanceof Error ? e.message : "交易被取消或失败");
      return;
    }

    startRollingAnimation(async (roll) => {
      const win = dir === "high" ? roll >= threshold : roll <= threshold;
      const hc = calcHitCount(dir, threshold);
      const bps = win ? (PAYOUT_BPS[hc] ?? 50000) : 0;
      const payout = win ? (amt * bps) / 10000 : 0;
      const rebate = win ? 0 : amt * 0.005;
      const r: RoundResult = {
        win, roll, direction: dir, threshold, amountTon: String(amt), odds,
        payoutTon: payout.toFixed(4), rebateTon: rebate.toFixed(4)
      };
      pendingResult.current = r;
      setResult(r);
      setShowResult(true);
      await pollAndSubmitScore();
    });
  }

  // ── Confirm modal → update balance & score (mock) ──
  function handleConfirm() {
    setShowResult(false);
    const r = pendingResult.current;
    if (!r) return;
    const amt = parseFloat(r.amountTon);
    const newBal = r.win
      ? balanceNum - amt + parseFloat(r.payoutTon)
      : balanceNum - amt + parseFloat(r.rebateTon);
    onBalanceChange(Math.max(0, newBal).toFixed(4));
    if (r.win) {
      onClaimableChange((Number(claimableTon) + parseFloat(r.payoutTon)).toFixed(4));
    } else if (parseFloat(r.rebateTon) > 0) {
      onClaimableChange((Number(claimableTon) + parseFloat(r.rebateTon)).toFixed(4));
    }
    setDisplayNum(threshold);
    pendingResult.current = null;
  }

  // ── Deposit (real chain) ──
  async function handleDeposit(amountStr: string) {
    const v = Number(amountStr);
    if (!Number.isFinite(v) || v < 0.01) return;
    if (DEV_MOCK) {
      onBalanceChange((balanceNum + v).toFixed(4));
      return;
    }
    if (!contract || !wallet) return;
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{ address: contract, amount: toNano(String(v)).toString(), payload: buildDepositPayload() }]
      });
    } catch (e) { setTxError(e instanceof Error ? e.message : "充值失败"); }
  }

  // ── Withdraw balance (real chain) ──
  async function handleWithdrawBalance() {
    if (balanceNum <= 0) return;
    if (DEV_MOCK) { onBalanceChange("0.0000"); return; }
    if (!contract || !wallet) return;
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{ address: contract, amount: toNano("0.05").toString(), payload: buildWithdrawBalancePayload(toNano(String(balanceNum))) }]
      });
    } catch (e) { setTxError(e instanceof Error ? e.message : "提现余额失败"); }
  }

  // ── Claim winnings (real chain) ──
  async function handleClaim() {
    if (Number(claimableTon) <= 0) return;
    if (DEV_MOCK) { onClaimableChange("0.0000"); return; }
    if (!contract || !wallet) return;
    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{ address: contract, amount: toNano("0.05").toString(), payload: buildClaimPayload(0n) }]
      });
    } catch (e) { setTxError(e instanceof Error ? e.message : "提现奖金失败"); }
  }

  // expose to parent via props (deposit/withdraw/claim called from ProfileSheet)
  useEffect(() => {
    // attach to window for ProfileSheet callbacks
    (window as unknown as Record<string, unknown>).__lobbyHandlers = { handleDeposit, handleWithdrawBalance, handleClaim };
  });

  const currentOdds = selectedDir ? calcOdds(selectedDir, threshold) : calcOdds("high", threshold);
  const oddsDisplay = mustWin ? "—" : (currentOdds ?? "—");

  return (
    <>
      <div className="flex flex-col gap-[22px]">

        {/* ── Bet info strip ── */}
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-[14px]"
          style={{
            background: "var(--surface)",
            border: `1px solid ${isRolling ? "var(--border-active)" : "var(--border)"}`,
            boxShadow: isRolling ? "0 0 0 1px rgba(99,102,241,0.2)" : "none",
            transition: "border-color 0.3s, box-shadow 0.3s"
          }}
        >
          <div className="flex flex-col gap-[2px]">
            <span className="text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--text-muted)" }}>{t.thisBet}</span>
            <span className="text-[20px] font-bold" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
              {parseFloat(amountTon) > 0 ? parseFloat(amountTon).toFixed(2) : "0.00"}
              <small className="text-[12px] font-medium ml-1" style={{ color: "var(--text-muted)" }}>TON</small>
            </span>
          </div>
          <div className="w-px h-9" style={{ background: "var(--border)" }} />
          <div className="flex flex-col gap-[2px] items-end">
            <span className="text-[11px] uppercase tracking-[0.05em]" style={{ color: "var(--text-muted)" }}>{t.currentOdds}</span>
            <span
              className="text-[20px] font-bold"
              style={{ color: mustWin ? "var(--text-muted)" : "var(--accent-bright)", letterSpacing: "-0.02em" }}
            >
              {mustWin ? t.invalid : `× ${oddsDisplay}`}
            </span>
          </div>
        </div>

        {/* ── Slider section ── */}
        <div
          className="flex flex-col gap-[14px] rounded-[20px] px-4 py-[18px] relative overflow-hidden"
          style={{
            background: "var(--surface)",
            border: `1px solid ${isRolling ? "rgba(99,102,241,0.5)" : "var(--border)"}`,
            boxShadow: isRolling ? "0 0 30px rgba(99,102,241,0.15)" : "none",
            transition: "border-color 0.3s, box-shadow 0.3s"
          }}
        >
          {/* Glow overlay */}
          <div
            className="absolute inset-0 rounded-[20px] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 60%, rgba(99,102,241,0.18) 0%, transparent 70%)",
              opacity: isRolling ? 1 : 0,
              transition: "opacity 0.4s"
            }}
          />

          {/* Header */}
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[12px] uppercase tracking-[0.04em]" style={{ color: "var(--text-muted)" }}>{t.targetNumber}</span>
            <div className="flex items-baseline gap-[6px]">
              <span
                className="text-[42px] font-extrabold min-w-[52px] text-center"
                style={{
                  color: isRolling ? "var(--accent-bright)" : "var(--text)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  animation: isRolling ? "numFlicker 0.12s ease-in-out infinite alternate" : "none"
                }}
              >
                {displayNum}
              </span>
              <span className="text-[14px] font-medium" style={{ color: "var(--text-muted)" }}>{t.dot}</span>
            </div>
          </div>

          {/* Slider */}
          <div className="relative z-10">
            <div className="flex justify-between px-[2px] mb-[10px]">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <span
                  key={n}
                  className="text-[11px]"
                  style={{
                    color: n === threshold ? "var(--accent-bright)" : "var(--text-muted)",
                    fontWeight: n === threshold ? 600 : 400,
                    transition: "color 0.2s"
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                type="range"
                min={1}
                max={6}
                step={1}
                value={isRolling ? displayNum : threshold}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                disabled={isRolling}
                className={isRolling ? "rolling" : ""}
                style={{ background: sliderStyle(isRolling ? displayNum : threshold) }}
              />
              {/* Scan line */}
              {isRolling && (
                <div
                  className="absolute top-[0px] h-1 rounded pointer-events-none"
                  style={{
                    background: "linear-gradient(to right, transparent, rgba(99,102,241,0.8), transparent)",
                    animation: "scanLine 0.5s ease-in-out infinite alternate"
                  }}
                />
              )}
            </div>
          </div>

          {/* Threshold buttons */}
          <div className="grid grid-cols-6 gap-[6px] relative z-10">
            {[1, 2, 3, 4, 5, 6].map((v) => {
              const isEdge = v === 1 || v === 6;
              const isSelected = threshold === v;
              const willMustWin = isMustWin(selectedDir, v);
              return (
                <button
                  key={v}
                  type="button"
                  disabled={isRolling}
                  onClick={() => selectThreshold(v)}
                  className="py-[10px] rounded-xl text-base font-semibold text-center relative"
                  style={{
                    border: isSelected
                      ? "1px solid var(--accent)"
                      : isEdge
                        ? "1px solid rgba(251,191,36,0.35)"
                        : "1px solid var(--border)",
                    background: isSelected
                      ? "rgba(99,102,241,0.15)"
                      : isEdge
                        ? "rgba(251,191,36,0.06)"
                        : "var(--surface2)",
                    color: isSelected
                      ? "var(--accent-bright)"
                      : willMustWin
                        ? "rgba(251,191,36,0.4)"
                        : isEdge
                          ? "rgba(251,191,36,0.75)"
                          : "var(--text-dim)",
                    boxShadow: isSelected ? "0 0 0 1px var(--accent)" : "none",
                    cursor: isRolling ? "not-allowed" : "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  {v}
                  {isEdge && (
                    <span
                      className="absolute -top-[7px] left-1/2 -translate-x-1/2 text-[9px] font-normal leading-none px-[4px] py-[1px] rounded-full"
                      style={{ background: "rgba(251,191,36,0.15)", color: "rgba(251,191,36,0.8)", whiteSpace: "nowrap" }}
                    >
                      5.0x
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Amount ── */}
        <div className="flex flex-col gap-[10px]">
          <span className="text-[12px] uppercase tracking-[0.04em]" style={{ color: "var(--text-muted)" }}>{t.betAmount}</span>
          <div
            className="flex items-center rounded-xl px-[14px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <input
              type="text"
              inputMode="decimal"
              value={amountTon}
              onChange={(e) => setAmountTon(e.target.value)}
              disabled={isRolling}
              className="flex-1 bg-transparent border-none outline-none py-3 text-lg font-semibold"
              style={{ color: "var(--text)", minWidth: 0 }}
            />
            <span className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>TON</span>
          </div>
          <div className="flex gap-[6px] flex-wrap">
            {[0.1, 0.5, 1, 5].map((v) => (
              <button
                key={v}
                type="button"
                disabled={isRolling}
                onClick={() => { setAmountTon(String(v)); setTxError(""); }}
                className="px-[10px] py-[6px] rounded-lg text-xs font-medium"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-dim)",
                  cursor: isRolling ? "not-allowed" : "pointer"
                }}
              >
                {v}
              </button>
            ))}
            {/* ×2 button */}
            <button
              type="button"
              disabled={isRolling}
              onClick={() => {
                const cur = parseFloat(amountTon) || 0;
                const doubled = cur * 2;
                const cap = Math.min(balanceNum, maxBet);
                if (doubled > cap) {
                  setTxError(t.doubleExceedsMax(doubled.toFixed(2), cap.toFixed(2)));
                } else {
                  setTxError("");
                  setAmountTon(doubled.toFixed(doubled < 1 ? 2 : 1));
                }
              }}
              className="px-[10px] py-[6px] rounded-lg text-xs font-medium"
              style={{
                border: "1px solid rgba(99,102,241,0.35)",
                background: "rgba(99,102,241,0.08)",
                color: "var(--accent-bright)",
                cursor: isRolling ? "not-allowed" : "pointer"
              }}
            >
              ×2
            </button>
            <button
              type="button"
              disabled={isRolling}
              onClick={() => { setAmountTon(String(Math.min(balanceNum, maxBet))); setTxError(""); }}
              className="px-[10px] py-[6px] rounded-lg text-xs font-medium"
              style={{
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-dim)",
                cursor: isRolling ? "not-allowed" : "pointer"
              }}
            >
              MAX
            </button>
          </div>
        </div>

        {/* ── Direction buttons ── */}
        <div className="grid grid-cols-2 gap-[10px]">
          {(["high", "low"] as const).map((dir) => {
            const isSelected = selectedDir === dir;
            const isHigh = dir === "high";
            return (
              <button
                key={dir}
                type="button"
                disabled={isRolling}
                onClick={() => selectDir(dir)}
                className="flex items-center justify-center gap-[8px] rounded-2xl py-[12px] px-3 relative overflow-hidden"
                style={{
                  border: isSelected
                    ? `2px solid ${isHigh ? "var(--green)" : "var(--red)"}`
                    : `2px solid ${isHigh ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
                  background: isSelected
                    ? isHigh ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.07)"
                    : "var(--surface)",
                  boxShadow: isSelected
                    ? isHigh ? "0 0 0 1px rgba(52,211,153,0.2)" : "0 0 0 1px rgba(248,113,113,0.2)"
                    : "none",
                  cursor: isRolling ? "not-allowed" : "pointer",
                  transition: "all 0.2s"
                }}
              >
                <span className="text-[18px] leading-none">{isHigh ? "📈" : "📉"}</span>
                <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
                  {isHigh ? t.betHigh : t.betLow}
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {isHigh ? `≥${threshold}` : `≤${threshold}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Start button ── */}
        <button
          type="button"
          disabled={!canStart}
          onClick={handleStartRound}
          className="w-full py-[17px] rounded-2xl text-base font-bold flex items-center justify-center gap-[10px]"
          style={{
            background: mustWin
              ? "rgba(251,191,36,0.08)"
              : !selectedDir
              ? "var(--surface2)"
              : "linear-gradient(135deg,#4f46e5,#6366f1)",
            border: mustWin
              ? "1px solid rgba(251,191,36,0.3)"
              : !selectedDir ? "1px solid var(--border)" : "none",
            color: mustWin
              ? "rgba(251,191,36,0.8)"
              : !selectedDir ? "var(--text-muted)" : "#fff",
            cursor: canStart ? "pointer" : "not-allowed",
            opacity: !canStart && selectedDir && !mustWin ? 0.5 : 1,
            boxShadow: selectedDir && !isRolling && !mustWin ? "0 4px 20px rgba(99,102,241,0.3)" : "none",
            animation: isRolling ? "startBtnPulse 1.1s ease-in-out infinite" : "none",
            transition: "background 0.2s, box-shadow 0.2s, color 0.2s"
          }}
        >
          {isRolling && (
            <span
              className="w-[18px] h-[18px] rounded-full flex-shrink-0"
              style={{
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                animation: "spin 0.7s linear infinite"
              }}
            />
          )}
          <span>
            {isRolling
              ? t.rolling
              : !selectedDir
              ? t.selectDirection
              : mustWin
              ? t.mustWinCombo
              : !isAmountValid
              ? t.minAmountHint(MIN_PLAY_TON)
              : !hasEnoughBalance
              ? t.insufficientBalance
              : t.startGame(
                  selectedDir === "high" ? t.betHigh : t.betLow,
                  selectedDir === "high" ? "≥" : "≤",
                  threshold
                )}
          </span>
        </button>

        {txError && (
          <p className="text-sm text-center" style={{ color: "var(--red)" }}>{txError}</p>
        )}
      </div>

      {/* Result modal */}
      {result && (
        <ResultModal
          show={showResult}
          win={result.win}
          roll={result.roll}
          direction={result.direction}
          threshold={result.threshold}
          amountTon={result.amountTon}
          odds={result.odds}
          payoutTon={result.payoutTon}
          rebateTon={result.rebateTon}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
