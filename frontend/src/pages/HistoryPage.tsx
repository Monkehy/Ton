import { useCallback, useEffect, useState } from "react";
import { useTonAddress } from "@tonconnect/ui-react";
import {
  fetchMyRounds,
  fetchRecentRounds,
  fetchWonLeaderboard,
  DEV_MOCK_WALLET,
  type RoundItem,
  type WonLeaderboardItem
} from "../lib/api";
import { useT } from "../i18n/LocaleContext";

type TabKey = "my" | "recent" | "won";

function RoundCard({ r }: { r: RoundItem }) {
  const { t } = useT();
  return (
    <li
      className="flex flex-col gap-[10px] rounded-2xl p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-mono" style={{ color: "var(--text-muted)" }}>{r.wallet}</span>
        <span
          className="text-[12px] font-semibold px-[8px] py-[2px] rounded-full"
          style={{
            background: r.win ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.1)",
            color: r.win ? "var(--green)" : "var(--red)"
          }}
        >
          {r.win ? t.winTag : t.loseTag}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: "var(--text-dim)" }}>
          {t.betCol} <span className="font-semibold" style={{ color: "var(--text)" }}>{r.amountTon} TON</span>
        </span>
        {r.win ? (
          <span className="text-[14px] font-bold" style={{ color: "var(--green)" }}>{t.plusPayout(r.payoutTon)}</span>
        ) : (
          <span className="text-[14px] font-bold" style={{ color: "var(--red)" }}>{t.minusLoss(r.lossTon)}</span>
        )}
      </div>
      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        {new Date(r.createdAt).toLocaleString()}
      </div>
    </li>
  );
}

function RankCard({ rank, wallet, value, valueColor }: { rank: number; wallet: string; value: string; valueColor: string }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <li
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="w-7 text-center flex-shrink-0">
        {medal
          ? <span className="text-base">{medal}</span>
          : <span className="text-[12px] font-semibold" style={{ color: "var(--text-muted)" }}>#{rank}</span>
        }
      </div>
      <span className="flex-1 text-[12px] font-mono truncate" style={{ color: "var(--text-dim)" }}>{wallet}</span>
      <span className="text-[14px] font-bold flex-shrink-0" style={{ color: valueColor }}>{value}</span>
    </li>
  );
}

export function HistoryPage({ onBack }: { onBack: () => void }) {
  const { t } = useT();
  const realWallet = useTonAddress();
  const wallet = DEV_MOCK_WALLET || realWallet;
  const [tab, setTab] = useState<TabKey>("my");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [myItems, setMyItems] = useState<RoundItem[]>([]);
  const [myCursor, setMyCursor] = useState<string | null>(null);
  const [recentItems, setRecentItems] = useState<RoundItem[]>([]);
  const [recentCursor, setRecentCursor] = useState<string | null>(null);
  const [wonItems, setWonItems] = useState<WonLeaderboardItem[]>([]);
  const [wonCursor, setWonCursor] = useState<string | null>(null);

  const loadMy = useCallback(async (cursor?: string | null, append = false) => {
    if (!wallet) { setMyItems([]); setMyCursor(null); return; }
    try {
      if (!append) setLoading(true); else setLoadingMore(true);
      setError("");
      const { items, nextCursor } = await fetchMyRounds(wallet, cursor);
      if (append) setMyItems((p) => [...p, ...items]); else setMyItems(items);
      setMyCursor(nextCursor);
    } catch (e) { setError(e instanceof Error ? e.message : t.loadFailed); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [wallet, t.loadFailed]);

  const loadRecent = useCallback(async (cursor?: string | null, append = false) => {
    try {
      if (!append) setLoading(true); else setLoadingMore(true);
      setError("");
      const { items, nextCursor } = await fetchRecentRounds(cursor);
      if (append) setRecentItems((p) => [...p, ...items]); else setRecentItems(items);
      setRecentCursor(nextCursor);
    } catch (e) { setError(e instanceof Error ? e.message : t.loadFailed); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [t.loadFailed]);

  const loadWon = useCallback(async (cursor?: string | null, append = false) => {
    try {
      if (!append) setLoading(true); else setLoadingMore(true);
      setError("");
      const { items, nextCursor } = await fetchWonLeaderboard(cursor);
      if (append) setWonItems((p) => [...p, ...items]); else setWonItems(items);
      setWonCursor(nextCursor);
    } catch (e) { setError(e instanceof Error ? e.message : t.loadFailed); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [t.loadFailed]);

  useEffect(() => {
    if (tab === "my") loadMy(null);
    else if (tab === "recent") loadRecent(null);
    else loadWon(null);
  }, [tab, loadMy, loadRecent, loadWon]);

  const currentCursor = tab === "my" ? myCursor : tab === "recent" ? recentCursor : wonCursor;
  const hasMore = Boolean(currentCursor);

  function handleLoadMore() {
    if (tab === "my" && myCursor) loadMy(myCursor, true);
    else if (tab === "recent" && recentCursor) loadRecent(recentCursor, true);
    else if (tab === "won" && wonCursor) loadWon(wonCursor, true);
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "my",     label: t.tabMy     },
    { key: "recent", label: t.tabRecent },
    { key: "won",    label: t.tabWon    },
  ];

  return (
    <div
      className="mx-auto min-h-screen max-w-[420px] flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-[14px]"
        style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-full"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--text-dim)", flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-base font-bold" style={{ color: "var(--text)" }}>{t.historyTitle}</h1>
      </header>

      {/* ── Tabs ── */}
      <div
        className="flex gap-[6px] overflow-x-auto px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className="shrink-0 rounded-full px-4 py-[7px] text-[13px] font-medium"
            style={{
              background: tab === tb.key ? "var(--accent)" : "var(--surface)",
              border: tab === tb.key ? "none" : "1px solid var(--border)",
              color: tab === tb.key ? "#fff" : "var(--text-dim)",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-[13px]"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)" }}
          >
            {error}
          </div>
        )}

        {tab === "my" && !wallet && (
          <div className="py-16 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>
            {t.connectWalletHint}
          </div>
        )}

        {loading && !loadingMore ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div
              className="w-7 h-7 rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--accent)", animation: "spin 0.7s linear infinite" }}
            />
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>{t.loadingText}</span>
          </div>
        ) : (
          <>
            {(tab === "my" || tab === "recent") && (
              <ul className="flex flex-col gap-[10px]">
                {(tab === "my" ? myItems : recentItems).map((r) => (
                  <RoundCard key={r.roundId} r={r} />
                ))}
              </ul>
            )}

            {tab === "won" && (
              <ul className="flex flex-col gap-[8px]">
                {wonItems.map((w) => (
                  <RankCard
                    key={w.walletRaw ?? w.wallet}
                    rank={w.rank}
                    wallet={w.wallet}
                    value={`${w.wonTon} TON`}
                    valueColor="var(--green)"
                  />
                ))}
              </ul>
            )}

            {tab === "my"     && myItems.length === 0     && wallet && <div className="py-16 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>{t.noMyRecords}</div>}
            {tab === "recent" && recentItems.length === 0            && <div className="py-16 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>{t.noRecentRecords}</div>}
            {tab === "won"    && wonItems.length === 0               && <div className="py-16 text-center text-[13px]" style={{ color: "var(--text-muted)" }}>{t.noWonData}</div>}

            {hasMore && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full px-6 py-[9px] text-[13px] font-medium"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-dim)",
                    cursor: loadingMore ? "not-allowed" : "pointer",
                    opacity: loadingMore ? 0.5 : 1
                  }}
                >
                  {loadingMore ? t.loadingText : t.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
