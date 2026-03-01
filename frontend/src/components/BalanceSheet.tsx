import { useState } from "react";
import { useT } from "../i18n/LocaleContext";

interface BalanceSheetProps {
  show: boolean;
  onClose: () => void;
  balanceTon: string;
  claimableTon: string;
}

export function BalanceSheet({ show, onClose, balanceTon, claimableTon }: BalanceSheetProps) {
  const { t } = useT();
  const [depositAmount, setDepositAmount] = useState("1.0");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  if (!show) return null;

  const handleDeposit = () => {
    const handlers = (window as Record<string, unknown>).__lobbyHandlers as {
      handleDeposit: (amt: string) => void;
    };
    if (handlers?.handleDeposit) {
      handlers.handleDeposit(depositAmount);
      onClose();
    }
  };

  const handleWithdrawBalance = () => {
    const handlers = (window as Record<string, unknown>).__lobbyHandlers as {
      handleWithdrawBalance: () => void;
    };
    if (handlers?.handleWithdrawBalance) {
      handlers.handleWithdrawBalance();
      onClose();
    }
  };

  const handleClaim = () => {
    const handlers = (window as Record<string, unknown>).__lobbyHandlers as {
      handleClaim: () => void;
    };
    if (handlers?.handleClaim) {
      handlers.handleClaim();
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[101] mx-auto max-w-[420px] rounded-t-3xl"
        style={{
          background: "var(--bg)",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.4)",
          animation: "slideUp 0.3s ease-out"
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {t.balanceManagement || "Balance Management"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface)", color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 flex flex-col gap-6">
          {/* Balance display */}
          <div className="flex gap-4">
            <div
              className="flex-1 rounded-2xl px-4 py-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                {t.gameBalance || "Game Balance"}
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                {balanceTon} <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>TON</span>
              </div>
            </div>
            <div
              className="flex-1 rounded-2xl px-4 py-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                {t.claimable || "Claimable"}
              </div>
              <div className="text-2xl font-bold" style={{ color: "var(--green)" }}>
                {claimableTon} <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>TON</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 rounded-xl p-1" style={{ background: "var(--surface)" }}>
            <button
              type="button"
              onClick={() => setActiveTab("deposit")}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: activeTab === "deposit" ? "var(--accent)" : "transparent",
                color: activeTab === "deposit" ? "#fff" : "var(--text-dim)"
              }}
            >
              {t.deposit || "Deposit"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("withdraw")}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: activeTab === "withdraw" ? "var(--accent)" : "transparent",
                color: activeTab === "withdraw" ? "#fff" : "var(--text-dim)"
              }}
            >
              {t.withdraw || "Withdraw"}
            </button>
          </div>

          {/* Deposit tab */}
          {activeTab === "deposit" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>
                  {t.depositAmount || "Deposit Amount"}
                </label>
                <div
                  className="flex items-center rounded-xl px-4 py-3"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-lg font-semibold"
                    style={{ color: "var(--text)" }}
                    placeholder="0.0"
                  />
                  <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>TON</span>
                </div>
              </div>

              <div className="flex gap-2">
                {[0.5, 1, 5, 10].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(String(amt))}
                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-dim)"
                    }}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleDeposit}
                className="w-full py-4 rounded-xl text-base font-bold"
                style={{
                  background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(99,102,241,0.3)"
                }}
              >
                {t.confirmDeposit || "Confirm Deposit"}
              </button>

              <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                {t.depositHint || "Deposit from your wallet to game balance"}
              </p>
            </div>
          )}

          {/* Withdraw tab */}
          {activeTab === "withdraw" && (
            <div className="flex flex-col gap-4">
              <div
                className="rounded-xl px-4 py-4"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="text-sm mb-3" style={{ color: "var(--text-dim)" }}>
                  {t.withdrawBalanceHint || "Withdraw your game balance back to wallet"}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {t.availableBalance || "Available Balance"}:
                  </span>
                  <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
                    {balanceTon} TON
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleWithdrawBalance}
                disabled={Number(balanceTon) <= 0}
                className="w-full py-4 rounded-xl text-base font-bold"
                style={{
                  background: Number(balanceTon) > 0 ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "var(--surface2)",
                  color: Number(balanceTon) > 0 ? "#fff" : "var(--text-muted)",
                  boxShadow: Number(balanceTon) > 0 ? "0 4px 20px rgba(99,102,241,0.3)" : "none",
                  cursor: Number(balanceTon) > 0 ? "pointer" : "not-allowed"
                }}
              >
                {t.withdrawAll || "Withdraw All Balance"}
              </button>

              {Number(claimableTon) > 0 && (
                <>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem" }} />
                  
                  <div
                    className="rounded-xl px-4 py-4"
                    style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)" }}
                  >
                    <div className="text-sm mb-3" style={{ color: "var(--text-dim)" }}>
                      {t.claimWinningsHint || "Claim your winnings and rebates"}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {t.claimable || "Claimable"}:
                      </span>
                      <span className="text-lg font-bold" style={{ color: "var(--green)" }}>
                        {claimableTon} TON
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClaim}
                    className="w-full py-4 rounded-xl text-base font-bold"
                    style={{
                      background: "linear-gradient(135deg,#10b981,#34d399)",
                      color: "#fff",
                      boxShadow: "0 4px 20px rgba(52,211,153,0.3)"
                    }}
                  >
                    {t.claimNow || "Claim Now"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
