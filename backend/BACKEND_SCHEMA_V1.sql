-- TON Dice Game Backend Schema V1

CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    telegram_id TEXT NOT NULL DEFAULT 'unknown',
    wallet      TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_wallet_idx ON users (wallet);

CREATE TABLE IF NOT EXISTS rounds (
    id          BIGSERIAL PRIMARY KEY,
    round_id    BIGINT NOT NULL,
    wallet      TEXT NOT NULL,
    direction   SMALLINT NOT NULL,
    threshold   SMALLINT NOT NULL,
    amount_nano NUMERIC(30,0) NOT NULL,
    roll        SMALLINT,
    result      SMALLINT NOT NULL DEFAULT 0,
    payout_nano NUMERIC(30,0) NOT NULL DEFAULT 0,
    rebate_nano NUMERIC(30,0) NOT NULL DEFAULT 0,
    tx_hash     TEXT UNIQUE,
    chain       TEXT NOT NULL DEFAULT 'ton',
    status      TEXT NOT NULL DEFAULT 'CONFIRMED',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rounds_wallet_idx     ON rounds (wallet, created_at DESC, round_id DESC);
CREATE INDEX IF NOT EXISTS rounds_created_at_idx ON rounds (created_at DESC, round_id DESC);

CREATE TABLE IF NOT EXISTS transactions (
    id          BIGSERIAL PRIMARY KEY,
    wallet      TEXT NOT NULL,
    tx_hash     TEXT NOT NULL UNIQUE,
    amount_nano NUMERIC(30,0) NOT NULL DEFAULT 0,
    tx_type     TEXT NOT NULL DEFAULT 'unknown',
    status      TEXT NOT NULL DEFAULT 'PENDING',
    chain       TEXT NOT NULL DEFAULT 'ton',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_wallet_idx  ON transactions (wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_hash_idx    ON transactions (tx_hash);

CREATE TABLE IF NOT EXISTS referral_bindings (
    id          BIGSERIAL PRIMARY KEY,
    wallet      TEXT NOT NULL UNIQUE,
    referrer    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_wallet_idx   ON referral_bindings (wallet);
CREATE INDEX IF NOT EXISTS referral_referrer_idx ON referral_bindings (referrer);
