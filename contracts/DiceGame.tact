// v1 skeleton for TON-TMA round contract.
// NOTE: this is a scaffold, not production-ready implementation.

fun native_prepare_random() {
    // Placeholder for random seed preparation. Replace with chain-supported impl.
}

contract DiceGame {
    owner: Address;
    paused: Bool;
    emergency: Bool;
    minAmount: Int;
    reserveFloor: Int;
    safetyFactorPpm: Int;
    balance: map<Address, Int>;   // deposited TON, used for play-without-transfer
    claimable: map<Address, Int>;
    roundSeq: Int;
    lastRoll: Int;
    lastResult: Int;
    lastCredit: Int;

    init(owner: Address) {
        self.owner = owner;
        self.paused = false;
        self.emergency = false;
        self.minAmount = ton("0.1");
        self.reserveFloor = ton("1000");
        self.safetyFactorPpm = 20000; // 0.02
        self.balance = emptyMap();
        self.claimable = emptyMap();
        self.roundSeq = 0;
        self.lastRoll = 0;
        self.lastResult = 0;
        self.lastCredit = 0;
    }

    receive(msg: Deposit) {
        require(!self.paused, "ERR_PAUSED");
        require(context().value > 0, "ERR_DEPOSIT_ZERO");
        let user = sender();
        let current = self.getBalance(user);
        self.balance.set(user, current + context().value);
    }

    receive(msg: PlayRound) {
        require(!self.paused, "ERR_PAUSED");
        require(!self.emergency, "ERR_EMERGENCY");
        self.assertDirection(msg.direction);
        require(msg.threshold >= 2 && msg.threshold <= 5, "ERR_INVALID_THRESHOLD");
        // Play from balance: no attached value, amount taken from msg
        require(context().value == 0, "ERR_USE_BALANCE");
        require(msg.amount >= self.minAmount, "ERR_AMOUNT_TOO_SMALL");
        let user = sender();
        let bal = self.getBalance(user);
        require(bal >= msg.amount, "ERR_INSUFFICIENT_BALANCE");

        self.balance.set(user, bal - msg.amount);

        native_prepare_random();
        let roll = (msg.clientNonce % 6) + 1;
        let isWin = self.calcIsWin(msg.direction, msg.threshold, roll);

        let amount = msg.amount;
        let credit = 0;
        let resultCode = 0;
        if (isWin) {
            let hitCount = self.calcHitCount(msg.direction, msg.threshold);
            let payoutBps = self.payoutBpsByHitCount(hitCount);
            credit = (amount * payoutBps) / 10000;
            resultCode = 1;
        } else {
            credit = (amount * 50) / 10000; // 0.5% rebate
        }

        if (credit > 0) {
            let current = self.getClaimable(user);
            self.claimable.set(user, current + credit);
        }

        self.roundSeq = self.roundSeq + 1;
        self.lastRoll = roll;
        self.lastResult = resultCode;
        self.lastCredit = credit;

        emit(RoundSettled {
            roundId: self.roundSeq,
            player: user,
            direction: msg.direction,
            threshold: msg.threshold,
            amount: amount,
            roll: roll,
            result: resultCode,
            credit: credit
        }.toCell());

        // TODO: platform and referral sub-ledger accounting
    }

    receive(msg: WithdrawBalance) {
        require(msg.amount > 0, "ERR_WITHDRAW_ZERO");
        let user = sender();
        let bal = self.getBalance(user);
        require(bal >= msg.amount, "ERR_INSUFFICIENT_BALANCE");
        self.balance.set(user, bal - msg.amount);
        message(MessageParameters{
            to: user,
            value: msg.amount,
            mode: SendPayFwdFeesSeparately | SendIgnoreErrors,
            bounce: false
        });
    }

    receive(msg: Pause) {
        self.assertOwner();
        self.paused = true;
    }

    receive(msg: Resume) {
        self.assertOwner();
        self.paused = false;
    }

    receive(msg: SetConfig) {
        self.assertOwner();
        self.minAmount = msg.minAmount;
        self.reserveFloor = msg.reserveFloor;
        self.safetyFactorPpm = msg.safetyFactorPpm;
    }

    receive(msg: Claim) {
        let user = sender();
        let current = self.getClaimable(user);
        let req = msg.amount;
        if (req == 0) {
            req = current;
        }

        require(req > 0, "ERR_CLAIM_EXCEED");
        require(req <= current, "ERR_CLAIM_EXCEED");

        let remain = current - req;
        if (remain == 0) {
            self.claimable.set(user, null);
        } else {
            self.claimable.set(user, remain);
        }

        message(MessageParameters{
            to: user,
            value: req,
            mode: SendPayFwdFeesSeparately | SendIgnoreErrors,
            bounce: false
        });
    }

    fun assertOwner() {
        require(sender() == self.owner, "ERR_NOT_OWNER");
    }

    fun assertDirection(direction: Int) {
        require(direction == 0 || direction == 1, "ERR_INVALID_DIRECTION");
    }

    fun getBalance(addr: Address): Int {
        let v = self.balance.get(addr);
        if (v == null) {
            return 0;
        }
        return v!!;
    }

    fun getClaimable(addr: Address): Int {
        let v = self.claimable.get(addr);
        if (v == null) {
            return 0;
        }
        return v!!;
    }

    get fun balanceOf(addr: Address): Int {
        return self.getBalance(addr);
    }

    get fun claimableOf(addr: Address): Int {
        return self.getClaimable(addr);
    }

    get fun config(): ConfigView {
        return ConfigView {
            owner: self.owner,
            paused: self.paused,
            emergency: self.emergency,
            minAmount: self.minAmount,
            reserveFloor: self.reserveFloor,
            safetyFactorPpm: self.safetyFactorPpm
        };
    }

    get fun roundState(): RoundStateView {
        return RoundStateView {
            roundSeq: self.roundSeq,
            lastRoll: self.lastRoll,
            lastResult: self.lastResult,
            lastCredit: self.lastCredit
        };
    }

    // direction: 0 => <=T, 1 => >=T
    // Boundary rule:
    // - T=1 and >=T is treated as >1 (exclude 1) => hitCount=5
    // - T=6 and <=T is treated as <6 (exclude 6) => hitCount=5
    fun calcHitCount(direction: Int, threshold: Int): Int {
        if (direction == 1) {
            if (threshold == 1) {
                return 5;
            }
            return 7 - threshold;
        }

        if (threshold == 6) {
            return 5;
        }
        return threshold;
    }

    fun calcIsWin(direction: Int, threshold: Int, roll: Int): Bool {
        if (direction == 1) {
            if (threshold == 1) {
                return roll > 1;
            }
            return roll >= threshold;
        }

        if (threshold == 6) {
            return roll < 6;
        }
        return roll <= threshold;
    }

    // Multiplier in bps (includes principal), aligned with margin target 4.75%.
    // hitCount: 1..6  => p = hitCount/6
    fun payoutBpsByHitCount(hitCount: Int): Int {
        if (hitCount == 1) {
            return 56900; // 5.6900x
        }
        if (hitCount == 2) {
            return 28475; // 2.8475x
        }
        if (hitCount == 3) {
            return 19000; // 1.9000x
        }
        if (hitCount == 4) {
            return 14263; // 1.4263x
        }
        if (hitCount == 5) {
            return 11420; // 1.1420x
        }
        if (hitCount == 6) {
            return 9525; // 0.9525x
        }
        require(false, "ERR_INVALID_HIT_COUNT");
        return 0;
    }
}

message Deposit {}

message PlayRound {
    direction: Int;   // 0: <=T, 1: >=T
    threshold: Int;   // allowed: 2,3,4,5
    amount: Int;      // stake from balance (no attached value)
    clientNonce: Int;
}

message WithdrawBalance {
    amount: Int;      // withdraw unused deposit back to wallet
}

message Pause {}
message Resume {}
message Claim {
    amount: Int; // 0 means claim all
}

message RoundSettled {
    roundId: Int;
    player: Address;
    direction: Int;
    threshold: Int;
    amount: Int;
    roll: Int;
    result: Int; // 1 win, 0 lose
    credit: Int; // added to claimable
}

struct ConfigView {
    owner: Address;
    paused: Bool;
    emergency: Bool;
    minAmount: Int;
    reserveFloor: Int;
    safetyFactorPpm: Int;
}

struct RoundStateView {
    roundSeq: Int;
    lastRoll: Int;
    lastResult: Int;
    lastCredit: Int;
}

message SetConfig {
    minAmount: Int;
    reserveFloor: Int;
    safetyFactorPpm: Int;
}
