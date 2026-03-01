-- TON Dice Game Backend Schema V1

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
