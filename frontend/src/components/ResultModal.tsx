import { useT } from "../i18n/LocaleContext";

interface ResultModalProps {
  show: boolean;
  win: boolean;
  roll: number;
  direction: "high" | "low";
  threshold: number;
  amountTon: string;
  odds: string;
  payoutTon: string;
  rebateTon: string;
  onConfirm: () => void;
}

export function ResultModal({
  show,
  win,
  roll,
  direction,
  threshold,
  amountTon,
  odds,
  payoutTon,
  rebateTon,
  onConfirm
}: ResultModalProps) {
  const { t } = useT();
  if (!show) return null;

  const sym = direction === "high" ? "≥" : "≤";
  const judgeOk = win;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-[360px] flex flex-col items-center gap-4 rounded-3xl p-7"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both"
        }}
      >
        {/* Icon */}
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[32px]"
          style={
            win
              ? { background: "rgba(52,211,153,0.15)", boxShadow: "0 0 0 1px rgba(52,211,153,0.3), 0 0 30px rgba(52,211,153,0.2)" }
              : { background: "rgba(248,113,113,0.1)", boxShadow: "0 0 0 1px rgba(248,113,113,0.2)" }
          }
        >
          {win ? "🎉" : "😔"}
        </div>

        {/* Title */}
        <div
          className="text-[22px] font-bold"
          style={{ color: win ? "var(--green)" : "var(--red)" }}
        >
          {win ? t.win : t.lose}
        </div>

        {/* Dice result */}
        <div className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
          <span>{t.rolledNumber}</span>
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[22px] font-bold"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            {roll}
          </div>
          <span style={{ color: judgeOk ? "var(--green)" : "var(--red)" }}>
            {sym} {threshold} {judgeOk ? "✓" : "✗"}
          </span>
        </div>

        {/* Detail */}
        <div
          className="w-full rounded-xl flex flex-col gap-2 px-4 py-3"
          style={{ background: "var(--surface2)" }}
        >
          <div className="flex justify-between text-[13px]">
            <span style={{ color: "var(--text-muted)" }}>{t.betLabel}</span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>{amountTon} TON</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: "var(--text-muted)" }}>{t.oddsLabel}</span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>× {odds}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: "var(--text-muted)" }}>{win ? t.gainedLabel : t.lostLabel}</span>
            {win ? (
              <span className="font-semibold" style={{ color: "var(--green)" }}>+ {payoutTon} TON</span>
            ) : (
              <span className="font-semibold" style={{ color: "var(--red)" }}>
                - {amountTon} TON
                {Number(rebateTon) > 0 && (
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{t.rebateNote(rebateTon)}</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Confirm */}
        <button
          type="button"
          onClick={onConfirm}
          className="w-full py-[14px] rounded-xl text-[15px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", border: "none", cursor: "pointer" }}
        >
          {t.confirm}
        </button>
      </div>
    </div>
  );
}
