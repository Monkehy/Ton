// DiceGame v2: Pure game logic, no fund storage
// Interacts with DepositVault and PrizePool for all financial operations

import "@stdlib/deploy";

fun native_prepare_random() {
    // Placeholder for random seed preparation
}

contract DiceGameV2 with Deployable {
    owner: Address;
    depositVault: Address;
    prizePool: Address;
    hotWallet: Address;  // backend hot wallet, only one allowed to send PlayRound
    
    paused: Bool;
    emergency: Bool;
    minAmount: Int;
    
    // Game state
    roundSeq: Int;
    lastRoll: Int;
    lastResult: Int;
    lastCredit: Int;
    
    init(owner: Address, depositVault: Address, prizePool: Address, hotWallet: Address) {
        self.owner = owner;
        self.depositVault = depositVault;
        self.prizePool = prizePool;
        self.hotWallet = hotWallet;
        self.paused = false;
        self.emergency = false;
        self.minAmount = ton("0.1");
        self.roundSeq = 0;
        self.lastRoll = 0;
        self.lastResult = 0;
        self.lastCredit = 0;
    }

    // ═══════════════════════════════════════════════════════════
    // Game Operations
    // ═══════════════════════════════════════════════════════════

    receive(msg: PlayRound) {
        require(!self.paused, "Game paused");
        require(!self.emergency, "Emergency mode");
        self.assertHotWallet();  // only backend hot wallet can trigger game
        self.assertDirection(msg.direction);
        require(msg.threshold >= 1 && msg.threshold <= 6, "Invalid threshold");
        require(msg.amount >= self.minAmount, "Amount too small");
        
        let player = msg.player;  // use player from message, not sender

        // Step 1: True on-chain random (before any sends)
        native_prepare_random();
        let seed = randomInt();
        let roll = (seed % 6) + 1;
        let isWin = self.calcIsWin(msg.direction, msg.threshold, roll);
        
        let amount = msg.amount;
        let credit = 0;
        let resultCode = 0;

        // Step 2: Deduct from DepositVault (fixed gas, not SendRemainingValue)
        send(SendParameters{
            to: self.depositVault,
            value: ton("0.02"),
            mode: SendPayGasSeparately,
            bounce: true,
            body: DeductForPlay{
                player: player,
                amount: msg.amount
            }.toCell()
        });
        
        if (isWin) {
            let hitCount = self.calcHitCount(msg.direction, msg.threshold);
            let payoutBps = self.payoutBpsByHitCount(hitCount);
            credit = (amount * payoutBps) / 10000;
            resultCode = 1;
            
            // Step 3a: Pay winnings from PrizePool
            send(SendParameters{
                to: self.prizePool,
                value: ton("0.02"),
                mode: SendPayGasSeparately,
                bounce: true,
                body: PayWinnings{
                    roundId: self.roundSeq + 1,
                    player: player,
                    amount: credit
                }.toCell()
            });
        } else {
            credit = (amount * 50) / 10000;
            
            if (credit > 0) {
                // Step 3b: Pay rebate from PrizePool
                send(SendParameters{
                    to: self.prizePool,
                    value: ton("0.02"),
                    mode: SendPayGasSeparately,
                    bounce: true,
                    body: PayRebate{
                        roundId: self.roundSeq + 1,
                        player: player,
                        amount: credit
                    }.toCell()
                });
            }
        }
        
        self.roundSeq = self.roundSeq + 1;
        self.lastRoll = roll;
        self.lastResult = resultCode;
        self.lastCredit = credit;
        
        emit(RoundSettled{
            roundId: self.roundSeq,
            player: player,
            direction: msg.direction,
            threshold: msg.threshold,
            amount: amount,
            roll: roll,
            result: resultCode,
            credit: credit
        }.toCell());
    }

    // ═══════════════════════════════════════════════════════════
    // Admin Operations
    // ═══════════════════════════════════════════════════════════

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
    }

    receive(msg: SetContracts) {
        self.assertOwner();
        if (msg.newDepositVault != null) {
            self.depositVault = msg.newDepositVault!!;
        }
        if (msg.newPrizePool != null) {
            self.prizePool = msg.newPrizePool!!;
        }
    }

    receive(msg: SetHotWallet) {
        self.assertOwner();
        self.hotWallet = msg.newHotWallet;
    }

    // ═══════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════

    fun assertOwner() {
        require(sender() == self.owner, "Not owner");
    }

    fun assertHotWallet() {
        require(sender() == self.hotWallet, "Not hot wallet");
    }

    fun assertDirection(direction: Int) {
        require(direction == 0 || direction == 1, "Invalid direction");
    }

    fun calcHitCount(direction: Int, threshold: Int): Int {
        if (direction == 1) {
            return 7 - threshold;  // >=T: t=1→6, t=6→1
        }
        return threshold;  // <=T: t=1→1, t=6→6
    }

    fun calcIsWin(direction: Int, threshold: Int, roll: Int): Bool {
        if (direction == 1) {
            return roll >= threshold;
        }
        return roll <= threshold;
    }

    // Updated payout table (1-face hit = 5.0x per your request)
    fun payoutBpsByHitCount(hitCount: Int): Int {
        if (hitCount == 1) {
            return 50000; // 5.0x
        }
        if (hitCount == 2) {
            return 28475; // 2.8475x
        }
        if (hitCount == 3) {
            return 19000; // 1.9x
        }
        if (hitCount == 4) {
            return 14263; // 1.4263x
        }
        if (hitCount == 5) {
            return 11420; // 1.142x
        }
        if (hitCount == 6) {
            return 9525; // 0.9525x (must-win, disallowed in frontend)
        }
        require(false, "Invalid hit count");
        return 0;
    }

    // ═══════════════════════════════════════════════════════════
    // Getters
    // ═══════════════════════════════════════════════════════════

    get fun config(): GameConfig {
        return GameConfig{
            owner: self.owner,
            depositVault: self.depositVault,
            prizePool: self.prizePool,
            hotWallet: self.hotWallet,
            paused: self.paused,
            emergency: self.emergency,
            minAmount: self.minAmount
        };
    }

    get fun roundState(): RoundStateView {
        return RoundStateView{
            roundSeq: self.roundSeq,
            lastRoll: self.lastRoll,
            lastResult: self.lastResult,
            lastCredit: self.lastCredit
        };
    }
}

// ═══════════════════════════════════════════════════════════
// Messages
// ═══════════════════════════════════════════════════════════

message PlayRound {
    player: Address;  // actual player (sent by backend hot wallet)
    direction: Int;   // 0: <=T, 1: >=T
    threshold: Int;   // 1-6
    amount: Int;
    clientNonce: Int;
}

message Pause {}
message Resume {}

message SetConfig {
    minAmount: Int;
}

message SetContracts {
    newDepositVault: Address?;
    newPrizePool: Address?;
}

message SetHotWallet {
    newHotWallet: Address;
}

// Outgoing messages to other contracts
message DeductForPlay {
    player: Address;
    amount: Int;
}

message PayWinnings {
    roundId: Int;
    player: Address;
    amount: Int;
}

message PayRebate {
    roundId: Int;
    player: Address;
    amount: Int;
}

// ═══════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════

message RoundSettled {
    roundId: Int;
    player: Address;
    direction: Int;
    threshold: Int;
    amount: Int;
    roll: Int;
    result: Int;
    credit: Int;
}

// ═══════════════════════════════════════════════════════════
// Views
// ═══════════════════════════════════════════════════════════

struct GameConfig {
    owner: Address;
    depositVault: Address;
    prizePool: Address;
    hotWallet: Address;
    paused: Bool;
    emergency: Bool;
    minAmount: Int;
}

struct RoundStateView {
    roundSeq: Int;
    lastRoll: Int;
    lastResult: Int;
    lastCredit: Int;
}
