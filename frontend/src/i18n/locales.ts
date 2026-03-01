export type Locale = "en" | "es" | "pt" | "zh-TW" | "ru";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en",    label: "English",    flag: "🇬🇧" },
  { code: "es",    label: "Español",    flag: "🇪🇸" },
  { code: "pt",    label: "Português",  flag: "🇧🇷" },
  { code: "zh-TW", label: "繁體中文",   flag: "🇭🇰" },
  { code: "ru",    label: "Русский",    flag: "🇷🇺" },
];

export interface Messages {
  // Header
  gameBalance: string;
  historyBtn: string;

  // Loading / error
  loading: string;
  loadFailed: string;
  backendHint: string;

  // NumberLobby – bet strip
  thisBet: string;
  currentOdds: string;
  invalid: string;

  // NumberLobby – slider
  targetNumber: string;
  dot: string;         // unit after number, e.g. "pts" / "点"

  // NumberLobby – amount
  betAmount: string;

  // NumberLobby – direction buttons
  betHigh: string;
  betLow: string;

  // NumberLobby – start button states
  rolling: string;
  selectDirection: string;
  mustWinCombo: string;
  minAmountHint: (min: number) => string;
  insufficientBalance: string;
  startGame: (dir: string, sym: string, threshold: number) => string;

  // NumberLobby – x2 error
  doubleExceedsMax: (doubled: string, cap: string) => string;

  // ResultModal
  win: string;
  lose: string;
  rolledNumber: string;
  betLabel: string;
  oddsLabel: string;
  gainedLabel: string;
  lostLabel: string;
  rebateNote: (amount: string) => string;
  confirm: string;

  // HistoryPage
  historyTitle: string;
  tabMy: string;
  tabRecent: string;
  tabWon: string;
  connectWalletHint: string;
  loadingText: string;
  noMyRecords: string;
  noRecentRecords: string;
  noWonData: string;
  loadMore: string;
  betRecord: string;
  winTag: string;
  loseTag: string;
  betCol: string;
  plusPayout: (v: string) => string;
  minusLoss: (v: string) => string;
}

const en: Messages = {
  gameBalance: "Balance",
  historyBtn: "Records",
  loading: "Loading…",
  loadFailed: "Failed to load",
  backendHint: "Make sure the backend is running (npm run dev:backend)",
  thisBet: "This Bet",
  currentOdds: "Odds",
  invalid: "Invalid",
  targetNumber: "Target",
  dot: "pts",
  betAmount: "Bet Amount",
  betHigh: "High",
  betLow: "Low",
  rolling: "Generating result…",
  selectDirection: "Select High or Low first",
  mustWinCombo: "Must-win combo — adjust your pick",
  minAmountHint: (min) => `Min bet: ${min} TON`,
  insufficientBalance: "Insufficient balance",
  startGame: (dir, sym, t) => `Start · ${dir} ${sym} ${t}`,
  doubleExceedsMax: (d, c) => `×2 result ${d} TON exceeds max ${c} TON`,
  win: "You Won!",
  lose: "Better Luck Next Time",
  rolledNumber: "Rolled",
  betLabel: "Bet",
  oddsLabel: "Odds",
  gainedLabel: "Gained",
  lostLabel: "Lost",
  rebateNote: (a) => ` (rebate ${a})`,
  confirm: "Confirm",
  historyTitle: "History",
  tabMy: "My Records",
  tabRecent: "Recent",
  tabWon: "Amount",
  connectWalletHint: "Connect wallet to view personal records",
  loadingText: "Loading…",
  noMyRecords: "No personal records yet",
  noRecentRecords: "No recent rounds",
  noWonData: "No amount data",
  loadMore: "Load More",
  betRecord: "Bet",
  winTag: "Win",
  loseTag: "Loss",
  betCol: "Bet",
  plusPayout: (v) => `+${v} TON`,
  minusLoss: (v) => `−${v} TON`,
};

const es: Messages = {
  gameBalance: "Saldo",
  historyBtn: "Historial",
  loading: "Cargando…",
  loadFailed: "Error al cargar",
  backendHint: "Asegúrate de que el backend esté en ejecución",
  thisBet: "Esta apuesta",
  currentOdds: "Cuota",
  invalid: "Inválido",
  targetNumber: "Objetivo",
  dot: "pts",
  betAmount: "Monto",
  betHigh: "Alto",
  betLow: "Bajo",
  rolling: "Generando resultado…",
  selectDirection: "Elige Alto o Bajo primero",
  mustWinCombo: "Combinación ganadora — ajusta tu elección",
  minAmountHint: (min) => `Apuesta mínima: ${min} TON`,
  insufficientBalance: "Saldo insuficiente",
  startGame: (dir, sym, t) => `Jugar · ${dir} ${sym} ${t}`,
  doubleExceedsMax: (d, c) => `×2 resultado ${d} TON supera el máximo ${c} TON`,
  win: "¡Ganaste!",
  lose: "¡Suerte la próxima!",
  rolledNumber: "Resultado",
  betLabel: "Apuesta",
  oddsLabel: "Cuota",
  gainedLabel: "Ganado",
  lostLabel: "Perdido",
  rebateNote: (a) => ` (reembolso ${a})`,
  confirm: "Confirmar",
  historyTitle: "Historial",
  tabMy: "Mis registros",
  tabRecent: "Recientes",
  tabScore: "Clasificación",
  tabWon: "Monto",
  connectWalletHint: "Conecta tu cartera para ver registros",
  loadingText: "Cargando…",
  noMyRecords: "Sin registros personales",
  noRecentRecords: "Sin rondas recientes",
  noScoreData: "Sin datos de puntuación",
  noWonData: "Sin datos de monto",
  loadMore: "Cargar más",
  betRecord: "Apuesta",
  winTag: "Ganó",
  loseTag: "Perdió",
  betCol: "Apuesta",
  plusPayout: (v) => `+${v} TON`,
  minusLoss: (v) => `−${v} TON`,
};

const pt: Messages = {
  gameBalance: "Saldo",
  historyBtn: "Histórico",
  loading: "Carregando…",
  loadFailed: "Falha ao carregar",
  backendHint: "Verifique se o backend está em execução",
  thisBet: "Esta aposta",
  currentOdds: "Odds",
  invalid: "Inválido",
  targetNumber: "Alvo",
  dot: "pts",
  betAmount: "Valor",
  betHigh: "Alto",
  betLow: "Baixo",
  rolling: "Gerando resultado…",
  selectDirection: "Escolha Alto ou Baixo primeiro",
  mustWinCombo: "Combinação garantida — ajuste sua escolha",
  minAmountHint: (min) => `Aposta mínima: ${min} TON`,
  insufficientBalance: "Saldo insuficiente",
  startGame: (dir, sym, t) => `Jogar · ${dir} ${sym} ${t}`,
  doubleExceedsMax: (d, c) => `×2 resultado ${d} TON excede o máximo ${c} TON`,
  win: "Você Ganhou!",
  lose: "Melhor sorte da próxima!",
  rolledNumber: "Resultado",
  betLabel: "Aposta",
  oddsLabel: "Odds",
  gainedLabel: "Ganho",
  lostLabel: "Perdido",
  rebateNote: (a) => ` (reembolso ${a})`,
  confirm: "Confirmar",
  historyTitle: "Histórico",
  tabMy: "Meus registros",
  tabRecent: "Recentes",
  tabScore: "Ranking",
  tabWon: "Montante",
  connectWalletHint: "Conecte sua carteira para ver registros",
  loadingText: "Carregando…",
  noMyRecords: "Sem registros pessoais",
  noRecentRecords: "Sem rodadas recentes",
  noScoreData: "Sem dados de pontuação",
  noWonData: "Sem dados de montante",
  loadMore: "Carregar mais",
  betRecord: "Aposta",
  winTag: "Ganhou",
  loseTag: "Perdeu",
  betCol: "Aposta",
  plusPayout: (v) => `+${v} TON`,
  minusLoss: (v) => `−${v} TON`,
};

const zhTW: Messages = {
  gameBalance: "遊戲餘額",
  historyBtn: "記錄",
  loading: "載入中…",
  loadFailed: "載入失敗",
  backendHint: "請確認後端已啟動 (npm run dev:backend)",
  thisBet: "本局投注",
  currentOdds: "當前賠率",
  invalid: "無效",
  targetNumber: "目標點數",
  dot: "點",
  betAmount: "投注金額",
  betHigh: "押大",
  betLow: "押小",
  rolling: "正在生成結果…",
  selectDirection: "請先選擇押大或押小",
  mustWinCombo: "此組合必贏，請調整選項",
  minAmountHint: (min) => `金額需 ≥ ${min} TON`,
  insufficientBalance: "遊戲餘額不足",
  startGame: (dir, sym, t) => `開始遊戲 · ${dir} ${sym} ${t}`,
  doubleExceedsMax: (d, c) => `×2 後 ${d} TON 超出最大可投注額 ${c} TON`,
  win: "恭喜獲勝！",
  lose: "下次好運！",
  rolledNumber: "擲出點數",
  betLabel: "投注",
  oddsLabel: "賠率",
  gainedLabel: "獲得",
  lostLabel: "輸掉",
  rebateNote: (a) => `（返水 ${a}）`,
  confirm: "確認",
  historyTitle: "歷史記錄",
  tabMy: "個人記錄",
  tabRecent: "最近對局",
  tabScore: "積分榜",
  tabWon: "總額",
  connectWalletHint: "請先連接錢包查看個人記錄",
  loadingText: "載入中…",
  noMyRecords: "暫無個人記錄",
  noRecentRecords: "暫無對局記錄",
  noScoreData: "暫無積分榜資料",
  noWonData: "暫無總額資料",
  loadMore: "載入更多",
  betRecord: "投注",
  winTag: "贏",
  loseTag: "輸",
  betCol: "投注",
  plusPayout: (v) => `+${v} TON`,
  minusLoss: (v) => `−${v} TON`,
};

const ru: Messages = {
  gameBalance: "Баланс",
  historyBtn: "История",
  loading: "Загрузка…",
  loadFailed: "Ошибка загрузки",
  backendHint: "Убедитесь, что бэкенд запущен",
  thisBet: "Ставка",
  currentOdds: "Коэффициент",
  invalid: "Недопустимо",
  targetNumber: "Цель",
  dot: "очк.",
  betAmount: "Сумма ставки",
  betHigh: "Больше",
  betLow: "Меньше",
  rolling: "Генерация результата…",
  selectDirection: "Сначала выберите Больше или Меньше",
  mustWinCombo: "Гарантированный выигрыш — измените выбор",
  minAmountHint: (min) => `Мин. ставка: ${min} TON`,
  insufficientBalance: "Недостаточно средств",
  startGame: (dir, sym, t) => `Играть · ${dir} ${sym} ${t}`,
  doubleExceedsMax: (d, c) => `×2 результат ${d} TON превышает максимум ${c} TON`,
  win: "Победа!",
  lose: "Повезёт в следующий раз!",
  rolledNumber: "Выпало",
  betLabel: "Ставка",
  oddsLabel: "Коэф.",
  gainedLabel: "Выиграно",
  lostLabel: "Проиграно",
  rebateNote: (a) => ` (возврат ${a})`,
  confirm: "Подтвердить",
  historyTitle: "История",
  tabMy: "Мои записи",
  tabRecent: "Последние",
  tabScore: "Рейтинг",
  tabWon: "Сумма",
  connectWalletHint: "Подключите кошелёк для просмотра записей",
  loadingText: "Загрузка…",
  noMyRecords: "Нет личных записей",
  noRecentRecords: "Нет последних раундов",
  noScoreData: "Нет данных рейтинга",
  noWonData: "Нет данных по сумме",
  loadMore: "Загрузить ещё",
  betRecord: "Ставка",
  winTag: "Выигрыш",
  loseTag: "Проигрыш",
  betCol: "Ставка",
  plusPayout: (v) => `+${v} TON`,
  minusLoss: (v) => `−${v} TON`,
};

export const messages: Record<Locale, Messages> = { en, es, pt, "zh-TW": zhTW, ru };
