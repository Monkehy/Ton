// DepositVault: Hot/Cold wallet separation for user deposits
// Manages user balance with 10% hot reserve, 90% cold storage

import "@stdlib/deploy";

const HOT_RATIO_BPS: Int = 1000;  // 10% (1000 / 10000)
const MAX_HOT_WITHDRAW_TON: Int = ton("10");  // Max single hot withdrawal
const MIN_HOT_RESERVE_TON: Int = ton("5");    // Minimum hot reserve threshold

contract DepositVault with Deployable {
    owner: Address;
    gameContract: Address;
    coldWalletAddress: Address;
    prizePool: Address;  // allowed to call CreditBalance
    
    paused: Bool;
    
    // User balances (logical accounting)
    userBalance: map<Address, Int>;
    
    // Hot wallet actual TON reserve
    hotReserve: Int;
    
    // Stats
    totalDeposits: Int;
    totalWithdrawn: Int;
    
    init(owner: Address, gameContract: Address, coldWalletAddress: Address, prizePool: Address) {
        self.owner = owner;
        self.gameContract = gameContract;
        self.coldWalletAddress = coldWalletAddress;
        self.prizePool = prizePool;
        self.paused = false;
        self.userBalance = emptyMap();
        self.hotReserve = 0;
        self.totalDeposits = 0;
        self.totalWithdrawn = 0;
    }

    // ═══════════════════════════════════════════════════════════
    // User Operations
    // ═══════════════════════════════════════════════════════════

    receive(msg: Deposit) {
        require(!self.paused, "Vault paused");
        let amount = context().value;
        require(amount > ton("0.01"), "Deposit too small");
        
        let user = sender();
        
        // Update user balance
        let currentBalance = self.getUserBalance(user);
        self.userBalance.set(user, currentBalance + amount);
        
        // Calculate hot/cold split
        let hotAmount = (amount * HOT_RATIO_BPS) / 10000;
        let coldAmount = amount - hotAmount;
        
        // Keep hot in contract
        self.hotReserve = self.hotReserve + hotAmount;
        
        // Forward cold to cold wallet
        if (coldAmount > 0) {
            send(SendParameters{
                to: self.coldWalletAddress,
                value: coldAmount,
                mode: SendPayGasSeparately,
                bounce: false
            });
        }
        
        self.totalDeposits = self.totalDeposits + amount;
        
        emit(DepositReceived{
            user: user,
            amount: amount,
            hotAmount: hotAmount,
            coldAmount: coldAmount,
            newBalance: currentBalance + amount
        }.toCell());
    }

    receive(msg: WithdrawRequest) {
        require(!self.paused, "Vault paused");
        let user = sender();
        let amount = msg.amount;
        
        require(amount > 0, "Amount must be positive");
        
        let balance = self.getUserBalance(user);
        require(balance >= amount, "Insufficient balance");
        
        // Check hot reserve availability
        if (amount <= MAX_HOT_WITHDRAW_TON && self.hotReserve >= amount) {
            // Direct hot withdrawal
            self.userBalance.set(user, balance - amount);
            self.hotReserve = self.hotReserve - amount;
            self.totalWithdrawn = self.totalWithdrawn + amount;
            
            send(SendParameters{
                to: user,
                value: amount,
                mode: SendPayGasSeparately | SendIgnoreErrors,
                bounce: false
            });
            
            emit(WithdrawalProcessed{
                user: user,
                amount: amount,
                fromHot: true
            }.toCell());
            
            // Alert if hot reserve low
            if (self.hotReserve < MIN_HOT_RESERVE_TON) {
                emit(HotReserveLowAlert{
                    currentReserve: self.hotReserve,
                    threshold: MIN_HOT_RESERVE_TON
                }.toCell());
            }
        } else {
            // Large withdrawal or hot depleted -> pending manual cold wallet release
            emit(WithdrawalPending{
                user: user,
                amount: amount,
                reason: amount > MAX_HOT_WITHDRAW_TON ? "Exceeds hot limit" : "Hot reserve depleted"
            }.toCell());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Game Contract Operations
    // ═══════════════════════════════════════════════════════════

    receive(msg: DeductForPlay) {
        self.assertGameContract();
        let user = msg.player;
        let amount = msg.amount;
        
        let balance = self.getUserBalance(user);
        require(balance >= amount, "Insufficient player balance");
        
        self.userBalance.set(user, balance - amount);
        
        emit(BalanceDeducted{
            user: user,
            amount: amount,
            remainingBalance: balance - amount
        }.toCell());
    }

    receive(msg: RefundToUser) {
        self.assertGameContract();
        let user = msg.player;
        let amount = msg.amount;
        
        let balance = self.getUserBalance(user);
        self.userBalance.set(user, balance + amount);
        
        emit(BalanceRefunded{
            user: user,
            amount: amount,
            newBalance: balance + amount
        }.toCell());
    }

    // Credit winnings/rebate back to user balance (called by PrizePool)
    receive(msg: CreditBalance) {
        self.assertPrizePool();
        let user = msg.player;
        let amount = msg.amount;
        require(amount > 0, "Credit amount must be positive");

        let balance = self.getUserBalance(user);
        self.userBalance.set(user, balance + amount);

        emit(BalanceCredited{
            user: user,
            amount: amount,
            newBalance: balance + amount
        }.toCell());
    }

    // ═══════════════════════════════════════════════════════════
    // Admin Operations
    // ═══════════════════════════════════════════════════════════

    receive(msg: RefillHotFromCold) {
        self.assertOwner();
        let amount = context().value;
        require(amount > 0, "Refill amount must be positive");
        
        self.hotReserve = self.hotReserve + amount;
        
        emit(HotReserveRefilled{
            amount: amount,
            newReserve: self.hotReserve
        }.toCell());
    }

    receive(msg: ProcessPendingWithdrawal) {
        self.assertOwner();
        let user = msg.user;
        let amount = msg.amount;
        
        let balance = self.getUserBalance(user);
        require(balance >= amount, "Insufficient user balance");
        
        // Admin manually sending from cold wallet, just update ledger
        self.userBalance.set(user, balance - amount);
        self.totalWithdrawn = self.totalWithdrawn + amount;
        
        emit(WithdrawalProcessed{
            user: user,
            amount: amount,
            fromHot: false
        }.toCell());
    }

    receive(msg: SetColdWallet) {
        self.assertOwner();
        self.coldWalletAddress = msg.newAddress;
    }
    
    receive(msg: SetGameContract) {
        self.assertOwner();
        self.gameContract = msg.newGameContract;
    }

    receive(msg: SetPrizePool) {
        self.assertOwner();
        self.prizePool = msg.newPrizePool;
    }

    receive(msg: Pause) {
        self.assertOwner();
        self.paused = true;
    }

    receive(msg: Resume) {
        self.assertOwner();
        self.paused = false;
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

    fun assertPrizePool() {
        require(sender() == self.prizePool, "Not prize pool");
    }

    fun getUserBalance(addr: Address): Int {
        let v = self.userBalance.get(addr);
        if (v == null) {
            return 0;
        }
        return v!!;
    }

    // ═══════════════════════════════════════════════════════════
    // Getters
    // ═══════════════════════════════════════════════════════════

    get fun balanceOf(addr: Address): Int {
        return self.getUserBalance(addr);
    }

    get fun vaultStats(): VaultStats {
        return VaultStats{
            hotReserve: self.hotReserve,
            totalDeposits: self.totalDeposits,
            totalWithdrawn: self.totalWithdrawn,
            paused: self.paused
        };
    }

    get fun config(): VaultConfig {
        return VaultConfig{
            owner: self.owner,
            gameContract: self.gameContract,
            coldWalletAddress: self.coldWalletAddress,
            prizePool: self.prizePool
        };
    }
}

// ═══════════════════════════════════════════════════════════
// Messages
// ═══════════════════════════════════════════════════════════

message Deposit {}

message WithdrawRequest {
    amount: Int;
}

message DeductForPlay {
    player: Address;
    amount: Int;
}

message RefundToUser {
    player: Address;
    amount: Int;
}

message RefillHotFromCold {}

message ProcessPendingWithdrawal {
    user: Address;
    amount: Int;
}

message SetColdWallet {
    newAddress: Address;
}

message SetGameContract {
    newGameContract: Address;
}

message SetPrizePool {
    newPrizePool: Address;
}

message CreditBalance {
    player: Address;
    amount: Int;
}

message Pause {}
message Resume {}

// ═══════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════

message DepositReceived {
    user: Address;
    amount: Int;
    hotAmount: Int;
    coldAmount: Int;
    newBalance: Int;
}

message WithdrawalProcessed {
    user: Address;
    amount: Int;
    fromHot: Bool;
}

message WithdrawalPending {
    user: Address;
    amount: Int;
    reason: String;
}

message BalanceDeducted {
    user: Address;
    amount: Int;
    remainingBalance: Int;
}

message BalanceRefunded {
    user: Address;
    amount: Int;
    newBalance: Int;
}

message BalanceCredited {
    user: Address;
    amount: Int;
    newBalance: Int;
}

message HotReserveLowAlert {
    currentReserve: Int;
    threshold: Int;
}

message HotReserveRefilled {
    amount: Int;
    newReserve: Int;
}

// ═══════════════════════════════════════════════════════════
// Views
// ═══════════════════════════════════════════════════════════

struct VaultStats {
    hotReserve: Int;
    totalDeposits: Int;
    totalWithdrawn: Int;
    paused: Bool;
}

struct VaultConfig {
    owner: Address;
    gameContract: Address;
    coldWalletAddress: Address;
    prizePool: Address;
}
