// PrizePool: Platform-funded prize pool for game payouts
// Isolated from user deposits, only pays winnings and rebates

import "@stdlib/deploy";

const RESERVE_FLOOR_TON: Int = ton("1000");  // Minimum pool reserve
const MAX_PAYOUT_PER_ROUND_BPS: Int = 100;   // Max 1% of pool per round (100/10000)

contract PrizePool with Deployable {
    owner: Address;
    gameContract: Address;
    depositVault: Address;  // credit winnings back to vault instead of direct payout
    
    paused: Bool;
    
    // Platform funds deposited by owner
    platformFunds: Int;
    
    // Stats
    totalPayouts: Int;
    totalRebates: Int;
    roundsPaid: Int;
    
    init(owner: Address, gameContract: Address, depositVault: Address) {
        self.owner = owner;
        self.gameContract = gameContract;
        self.depositVault = depositVault;
        self.paused = false;
        self.platformFunds = 0;
        self.totalPayouts = 0;
        self.totalRebates = 0;
        self.roundsPaid = 0;
    }

    // ═══════════════════════════════════════════════════════════
    // Platform Operations
    // ═══════════════════════════════════════════════════════════

    receive(msg: FundPrizePool) {
        self.assertOwner();
        let amount = context().value;
        require(amount > 0, "Fund amount must be positive");
        
        self.platformFunds = self.platformFunds + amount;
        
        emit(PrizePoolFunded{
            amount: amount,
            newTotal: self.platformFunds
        }.toCell());
    }

    receive(msg: WithdrawPlatformFunds) {
        self.assertOwner();
        let amount = msg.amount;
        
        require(amount > 0, "Withdraw amount must be positive");
        require(self.platformFunds >= amount, "Insufficient platform funds");
        
        // Ensure reserve floor is maintained
        let remaining = self.platformFunds - amount;
        require(remaining >= RESERVE_FLOOR_TON, "Cannot go below reserve floor");
        
        self.platformFunds = remaining;
        
        send(SendParameters{
            to: self.owner,
            value: amount,
            mode: SendPayGasSeparately | SendIgnoreErrors,
            bounce: false
        });
        
        emit(PlatformFundsWithdrawn{
            amount: amount,
            remainingFunds: remaining
        }.toCell());
    }

    // ═══════════════════════════════════════════════════════════
    // Game Contract Operations
    // ═══════════════════════════════════════════════════════════

    receive(msg: PayWinnings) {
        require(!self.paused, "Prize pool paused");
        self.assertGameContract();
        
        let player = msg.player;
        let amount = msg.amount;
        let roundId = msg.roundId;
        
        require(amount > 0, "Payout amount must be positive");
        
        // Check max payout limit per round
        let maxPayout = (self.platformFunds * MAX_PAYOUT_PER_ROUND_BPS) / 10000;
        require(amount <= maxPayout, "Payout exceeds max per round");
        
        require(self.platformFunds >= amount, "Insufficient prize pool");
        
        self.platformFunds = self.platformFunds - amount;
        self.totalPayouts = self.totalPayouts + amount;
        self.roundsPaid = self.roundsPaid + 1;
        
        // Credit winnings back to player's DepositVault balance
        send(SendParameters{
            to: self.depositVault,
            value: amount,
            mode: SendPayGasSeparately,
            bounce: true,
            body: CreditBalance{
                player: player,
                amount: amount
            }.toCell()
        });
        
        emit(WinningsPaid{
            roundId: roundId,
            player: player,
            amount: amount,
            remainingPool: self.platformFunds
        }.toCell());
        
        // Alert if pool running low
        if (self.platformFunds < RESERVE_FLOOR_TON * 2) {
            emit(PrizePoolLowAlert{
                currentPool: self.platformFunds,
                threshold: RESERVE_FLOOR_TON * 2
            }.toCell());
        }
    }

    receive(msg: PayRebate) {
        require(!self.paused, "Prize pool paused");
        self.assertGameContract();
        
        let player = msg.player;
        let amount = msg.amount;
        let roundId = msg.roundId;
        
        require(amount > 0, "Rebate amount must be positive");
        require(self.platformFunds >= amount, "Insufficient prize pool");
        
        self.platformFunds = self.platformFunds - amount;
        self.totalRebates = self.totalRebates + amount;
        
        // Credit rebate back to player's DepositVault balance
        send(SendParameters{
            to: self.depositVault,
            value: amount,
            mode: SendPayGasSeparately,
            bounce: true,
            body: CreditBalance{
                player: player,
                amount: amount
            }.toCell()
        });
        
        emit(RebatePaid{
            roundId: roundId,
            player: player,
            amount: amount
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

    receive(msg: SetGameContract) {
        self.assertOwner();
        self.gameContract = msg.newGameContract;
    }

    receive(msg: SetDepositVault) {
        self.assertOwner();
        self.depositVault = msg.newDepositVault;
    }

    // ═══════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════

    fun assertOwner() {
        require(sender() == self.owner, "Not owner");
    }

    fun assertGameContract() {
        require(sender() == self.gameContract, "Not game contract");
    }

    // ═══════════════════════════════════════════════════════════
    // Getters
    // ═══════════════════════════════════════════════════════════

    get fun poolStats(): PoolStats {
        return PoolStats{
            platformFunds: self.platformFunds,
            totalPayouts: self.totalPayouts,
            totalRebates: self.totalRebates,
            roundsPaid: self.roundsPaid,
            paused: self.paused
        };
    }

    get fun config(): PoolConfig {
        return PoolConfig{
            owner: self.owner,
            gameContract: self.gameContract,
            reserveFloor: RESERVE_FLOOR_TON,
            maxPayoutPerRoundBps: MAX_PAYOUT_PER_ROUND_BPS
        };
    }

    get fun maxPayoutNow(): Int {
        return (self.platformFunds * MAX_PAYOUT_PER_ROUND_BPS) / 10000;
    }
}

// ═══════════════════════════════════════════════════════════
// Messages
// ═══════════════════════════════════════════════════════════

message FundPrizePool {}

message WithdrawPlatformFunds {
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

message Pause {}
message Resume {}

message SetGameContract {
    newGameContract: Address;
}

message SetDepositVault {
    newDepositVault: Address;
}

message CreditBalance {
    player: Address;
    amount: Int;
}

// ═══════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════

message PrizePoolFunded {
    amount: Int;
    newTotal: Int;
}

message PlatformFundsWithdrawn {
    amount: Int;
    remainingFunds: Int;
}

message WinningsPaid {
    roundId: Int;
    player: Address;
    amount: Int;
    remainingPool: Int;
}

message RebatePaid {
    roundId: Int;
    player: Address;
    amount: Int;
}

message PrizePoolLowAlert {
    currentPool: Int;
    threshold: Int;
}

// ═══════════════════════════════════════════════════════════
// Views
// ═══════════════════════════════════════════════════════════

struct PoolStats {
    platformFunds: Int;
    totalPayouts: Int;
    totalRebates: Int;
    roundsPaid: Int;
    paused: Bool;
}

struct PoolConfig {
    owner: Address;
    gameContract: Address;
    reserveFloor: Int;
    maxPayoutPerRoundBps: Int;
}
