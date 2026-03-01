import { useEffect, useRef, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { TonConnectButton, useTonAddress, useTonWallet } from "@tonconnect/ui-react";
import { useTonConnectUI } from "@tonconnect/ui-react";
import { toNano } from "@ton/core";
import { fetchUserStatus, type UserStatus, DEV_MOCK_WALLET } from "../lib/api";
import { 
  buildDepositPayload, 
  buildWithdrawBalancePayload, 
  buildClaimPayload 
} from "../lib/playRound";
import { CleanSnakeGame } from "./CleanSnakeGame";
import { HistoryPage } from "./HistoryPage";
import { NumberLobby } from "./NumberLobby";
import { BalanceSheet } from "../components/BalanceSheet";
import { useT } from "../i18n/LocaleContext";
import { LOCALES } from "../i18n/locales";

export function EntryGate() {
  const { t, locale, setLocale, locales } = useT();
  const realWallet = useTonAddress();
  const tonWallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = DEV_MOCK_WALLET || realWallet;
  const connected = DEV_MOCK_WALLET ? true : tonWallet !== null;

  const [view, setView] = useState<"main" | "history">("main");
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showBalanceSheet, setShowBalanceSheet] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Hide language switcher in restricted regions
  const isRestricted = status?.mode === "MODE_CLEAN";

  // Balance state lives here so header, lobby and profile stay in sync
  const [balanceTon, setBalanceTon] = useState(DEV_MOCK_WALLET ? "10.0000" : "0.0000");
  const [claimableTon, setClaimableTon] = useState("0.0000");

  // Animate balance changes
  const balanceRef = useRef<HTMLSpanElement>(null);
  const prevBalance = useRef(balanceTon);

  useEffect(() => {
    try { WebApp.ready(); } catch { /* non-Telegram env */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchUserStatus(wallet)
      .then((res) => {
        setStatus(res);
        if (res.balanceTon) setBalanceTon(res.balanceTon);
        if (res.claimableTon) setClaimableTon(res.claimableTon);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t.loadFailed))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  // Animate balance number when it changes
  useEffect(() => {
    if (prevBalance.current === balanceTon) return;
    prevBalance.current = balanceTon;
    const el = balanceRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "countUp 0.3s ease-out";
  }, [balanceTon]);

  // ── Deposit, Withdraw, Claim handlers ──
  const handleDeposit = async (amountStr: string) => {
    const v = Number(amountStr);
    if (!Number.isFinite(v) || v < 0.01) {
      throw new Error("Invalid deposit amount");
    }
    
    if (DEV_MOCK_WALLET) {
      const newBalance = Number(balanceTon) + v;
      setBalanceTon(newBalance.toFixed(4));
      return;
    }
    
    const contract = status?.contractAddress;
    if (!contract || !wallet) {
      throw new Error("Contract address or wallet not available");
    }
    
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [{ 
        address: contract, 
        amount: toNano(String(v)).toString(), 
        payload: buildDepositPayload() 
      }]
    });
  };

  const handleWithdrawBalance = async () => {
    const balanceNum = Number(balanceTon);
    if (balanceNum <= 0) {
      throw new Error("No balance to withdraw");
    }
    
    if (DEV_MOCK_WALLET) {
      setBalanceTon("0.0000");
      return;
    }
    
    const contract = status?.contractAddress;
    if (!contract || !wallet) {
      throw new Error("Contract address or wallet not available");
    }
    
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [{ 
        address: contract, 
        amount: "0", 
        payload: buildWithdrawBalancePayload(toNano(String(balanceNum))) 
      }]
    });
  };

  const handleClaim = async () => {
    const claimNum = Number(claimableTon);
    if (claimNum <= 0) {
      throw new Error("No claimable amount");
    }
    
    if (DEV_MOCK_WALLET) {
      setClaimableTon("0.0000");
      return;
    }
    
    const contract = status?.contractAddress;
    if (!contract || !wallet) {
      throw new Error("Contract address or wallet not available");
    }
    
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [{ 
        address: contract, 
        amount: "0", 
        payload: buildClaimPayload(0n) 
      }]
    });
  };

  // ── Loading / Error states ──
  if (loading && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--accent)", animation: "spin 0.7s linear infinite" }} />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>{t.loading}</span>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6" style={{ background: "var(--bg)" }}>
        <p className="text-base font-semibold" style={{ color: "var(--red)" }}>{t.loadFailed}</p>
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>{error}</p>
        <p className="text-xs text-center" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          {t.backendHint}
        </p>
      </div>
    );
  }

  if (view === "history") {
    return <HistoryPage onBack={() => setView("main")} />;
  }

  const currentLocaleInfo = LOCALES.find((l) => l.code === locale)!;

  return (
    <div className="mx-auto min-h-screen max-w-[420px] flex flex-col" style={{ background: "var(--bg)" }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-[14px]"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Left: wallet pill + history button */}
        <div className="flex items-center gap-2">
          {connected && wallet ? (
            <button
              type="button"
              onClick={() => setShowDisconnectModal(true)}
              className="flex items-center gap-2 rounded-full px-3 py-[7px] cursor-pointer"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} />
              <span className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
                {wallet.slice(0, 6)}…{wallet.slice(-4)}
              </span>
            </button>
          ) : (
            <TonConnectButton />
          )}
          <button
            type="button"
            onClick={() => setView("history")}
            className="flex items-center gap-[5px] rounded-full px-3 py-[7px] text-[13px] font-medium"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer", transition: "border-color 0.2s, color 0.2s" }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
              <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8 6.507 6.507 0 0 0 8 1.5ZM8 13A5 5 0 1 1 13 8 5.006 5.006 0 0 1 8 13Z" fill="currentColor"/>
              <path d="M8.75 4.75H7.25V8.56l2.97 2.97 1.06-1.06-2.53-2.53V4.75Z" fill="currentColor"/>
            </svg>
            {t.historyBtn}
          </button>
        </div>

        {/* Right: balance + language switcher */}
        <div className="flex items-center gap-2">
          {/* Language switcher - hidden in restricted regions */}
          {!isRestricted && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLangMenu((v) => !v)}
                className="flex items-center gap-[4px] rounded-full px-[10px] py-[7px] text-[12px] font-medium"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer" }}
              >
                <span>{currentLocaleInfo.flag}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, marginTop: 1 }}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {showLangMenu && (
                <>
                  {/* Backdrop to close */}
                  <div
                    className="fixed inset-0 z-[99]"
                    onClick={() => setShowLangMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-[calc(100%+6px)] z-[100] flex flex-col rounded-2xl overflow-hidden py-1 min-w-[148px]"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
                  >
                    {locales.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => { 
                          console.log("[Lang Menu] Clicked:", l.code, l.label);
                          setLocale(l.code); 
                          setShowLangMenu(false); 
                        }}
                        onMouseEnter={(e) => {
                          if (locale !== l.code) {
                            e.currentTarget.style.background = "rgba(99,102,241,0.06)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (locale !== l.code) {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                        className="flex items-center gap-[10px] px-4 py-[10px] text-[13px] text-left"
                        style={{
                          background: locale === l.code ? "rgba(99,102,241,0.12)" : "transparent",
                          color: locale === l.code ? "var(--accent-bright)" : "var(--text-dim)",
                          cursor: "pointer",
                          transition: "background 0.1s"
                        }}
                      >
                        <span className="text-base leading-none">{l.flag}</span>
                        <span>{l.label}</span>
                        {locale === l.code && (
                          <svg className="ml-auto" width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Balance */}
          <button
            type="button"
            onClick={() => setShowBalanceSheet(true)}
            className="flex flex-col items-end cursor-pointer"
            style={{ background: "transparent", border: "none", padding: 0 }}
          >
            <span className="text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--text-muted)" }}>{t.gameBalance}</span>
            <div className="text-lg font-bold leading-tight" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>
              <span ref={balanceRef}>{balanceTon}</span>
              <span className="text-[11px] font-medium ml-[2px]" style={{ color: "var(--text-muted)" }}>TON</span>
            </div>
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 px-4 py-5">
        {!status ? null : status.mode === "MODE_CLEAN" ? (
          <CleanSnakeGame />
        ) : (
          <NumberLobby
            wallet={wallet}
            contractAddress={status.contractAddress}
            balanceTon={balanceTon}
            claimableTon={claimableTon}
            maxAmountTon={status.maxAmountTon}
            onBalanceChange={setBalanceTon}
            onClaimableChange={setClaimableTon}
          />
        )}
      </main>

      {/* Balance management sheet */}
      <BalanceSheet
        show={showBalanceSheet}
        onClose={() => setShowBalanceSheet(false)}
        balanceTon={balanceTon}
        claimableTon={claimableTon}
        onDeposit={handleDeposit}
        onWithdrawBalance={handleWithdrawBalance}
        onClaim={handleClaim}
      />

      {/* Disconnect confirmation modal */}
      {showDisconnectModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setShowDisconnectModal(false)}
          />

          {/* Modal */}
          <div
            className="fixed top-1/2 left-1/2 z-[101] w-[90%] max-w-[340px] rounded-2xl p-6"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              transform: "translate(-50%, -50%)",
              animation: "modalFadeIn 0.2s ease-out"
            }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text)" }}>
              {t.disconnectWallet || "Disconnect Wallet"}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-dim)" }}>
              {t.disconnectConfirm || "Are you sure you want to disconnect your wallet?"}
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-dim)"
                }}
              >
                {t.cancel || "Cancel"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!DEV_MOCK_WALLET) {
                    await tonConnectUI.disconnect();
                  }
                  setShowDisconnectModal(false);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg,#ef4444,#f87171)",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(239,68,68,0.3)"
                }}
              >
                {t.disconnect || "Disconnect"}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes modalFadeIn {
              from {
                opacity: 0;
                transform: translate(-50%, -48%);
              }
              to {
                opacity: 1;
                transform: translate(-50%, -50%);
              }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
