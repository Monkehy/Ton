// MultiSigColdWallet: Multi-signature cold storage for 90% of user deposits
// Requires M-of-N admin signatures for any withdrawal
// Simplified version: uses combined key for signatures

import "@stdlib/deploy";

const REQUIRED_SIGNATURES: Int = 3;  // 3 out of 5 signers required
const MAX_SIGNERS: Int = 5;

contract MultiSigColdWallet with Deployable {
    owner: Address;
    
    // Signers list (up to MAX_SIGNERS)
    signers: map<Int, Address>;  // index => address
    signerCount: Int;
    
    // Pending transactions
    pendingTxs: map<Int, PendingTransaction>;
    nextTxId: Int;
    
    // Transaction signatures: combined key (txId * 100 + signerIndex) => Bool
    // This avoids nested map limitation
    txSignatures: map<Int, Bool>;
    
    init(owner: Address, initialSigners: map<Int, Address>) {
        self.owner = owner;
        self.signers = initialSigners;
        self.signerCount = 5;  // Assuming 5 signers passed in init
        self.pendingTxs = emptyMap();
        self.nextTxId = 1;
        self.txSignatures = emptyMap();
    }

    // ═══════════════════════════════════════════════════════════
    // Receive Deposits (no signature required)
    // ═══════════════════════════════════════════════════════════

    receive() {
        // Accept any TON sent to this contract (cold storage)
        let amount = context().value;
        emit(FundsReceived{
            from: sender(),
            amount: amount
        }.toCell());
    }

    // ═══════════════════════════════════════════════════════════
    // Propose Withdrawal (any signer can propose)
    // ═══════════════════════════════════════════════════════════

    receive(msg: ProposeWithdrawal) {
        let signerIdx = self.getSignerIndex(sender());
        require(signerIdx >= 0, "Not a signer");
        
        let txId = self.nextTxId;
        self.nextTxId = self.nextTxId + 1;
        
        // Store pending transaction
        self.pendingTxs.set(txId, PendingTransaction{
            txId: txId,
            to: msg.to,
            amount: msg.amount,
            proposer: sender(),
            signatureCount: 1,
            executed: false
        });
        
        // Add first signature using combined key
        let combinedKey = txId * 100 + signerIdx;
        self.txSignatures.set(combinedKey, true);
        
        emit(WithdrawalProposed{
            txId: txId,
            to: msg.to,
            amount: msg.amount,
            proposer: sender()
        }.toCell());
    }

    // ═══════════════════════════════════════════════════════════
    // Sign Transaction
    // ═══════════════════════════════════════════════════════════

    receive(msg: SignTransaction) {
        let signerIdx = self.getSignerIndex(sender());
        require(signerIdx >= 0, "Not a signer");
        
        let txId = msg.txId;
        let txOpt = self.pendingTxs.get(txId);
        require(txOpt != null, "Transaction not found");
        
        let tx = txOpt!!;
        require(!tx.executed, "Already executed");
        
        // Check if already signed using combined key
        let combinedKey = txId * 100 + signerIdx;
        let alreadySigned = self.txSignatures.get(combinedKey);
        require(alreadySigned == null || !alreadySigned!!, "Already signed");
        
        // Add signature
        self.txSignatures.set(combinedKey, true);
        
        // Update signature count
        tx.signatureCount = tx.signatureCount + 1;
        self.pendingTxs.set(txId, tx);
        
        emit(TransactionSigned{
            txId: txId,
            signer: sender(),
            signatureCount: tx.signatureCount
        }.toCell());
        
        // Auto-execute if threshold reached
        if (tx.signatureCount >= REQUIRED_SIGNATURES) {
            self.executeWithdrawal(txId, tx);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // Execute Withdrawal (internal)
    // ═══════════════════════════════════════════════════════════

    fun executeWithdrawal(txId: Int, tx: PendingTransaction) {
        require(!tx.executed, "Already executed");
        require(tx.signatureCount >= REQUIRED_SIGNATURES, "Not enough signatures");
        
        // Mark as executed
        tx.executed = true;
        self.pendingTxs.set(txId, tx);
        
        // Send funds
        send(SendParameters{
            to: tx.to,
            value: tx.amount,
            mode: SendPayGasSeparately | SendIgnoreErrors,
            bounce: false
        });
        
        emit(WithdrawalExecuted{
            txId: txId,
            to: tx.to,
            amount: tx.amount
        }.toCell());
    }

    // ═══════════════════════════════════════════════════════════
    // Admin Operations
    // ═══════════════════════════════════════════════════════════

    receive(msg: AddSigner) {
        self.assertOwner();
        require(self.signerCount < MAX_SIGNERS, "Max signers reached");
        
        self.signers.set(self.signerCount, msg.newSigner);
        self.signerCount = self.signerCount + 1;
        
        emit(SignerAdded{
            signer: msg.newSigner,
            newCount: self.signerCount
        }.toCell());
    }

    receive(msg: RemoveSigner) {
        self.assertOwner();
        let idx = self.getSignerIndex(msg.signer);
        require(idx >= 0, "Signer not found");
        
        // Shift signers down to fill gap
        let i = idx;
        while (i < self.signerCount - 1) {
            let next = self.signers.get(i + 1);
            if (next != null) {
                self.signers.set(i, next!!);
            }
            i = i + 1;
        }
        
        self.signers.set(self.signerCount - 1, null);
        self.signerCount = self.signerCount - 1;
        
        emit(SignerRemoved{
            signer: msg.signer,
            newCount: self.signerCount
        }.toCell());
    }

    // ═══════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════

    fun assertOwner() {
        require(sender() == self.owner, "Not owner");
    }

    fun getSignerIndex(addr: Address): Int {
        let i = 0;
        while (i < self.signerCount) {
            let s = self.signers.get(i);
            if (s != null && s!! == addr) {
                return i;
            }
            i = i + 1;
        }
        return -1;
    }

    // ═══════════════════════════════════════════════════════════
    // Getters
    // ═══════════════════════════════════════════════════════════

    get fun signersList(): map<Int, Address> {
        return self.signers;
    }

    get fun pendingTransaction(txId: Int): PendingTransaction? {
        return self.pendingTxs.get(txId);
    }

    get fun config(): ColdWalletConfig {
        return ColdWalletConfig{
            owner: self.owner,
            signerCount: self.signerCount,
            requiredSignatures: REQUIRED_SIGNATURES,
            nextTxId: self.nextTxId
        };
    }
}

// ═══════════════════════════════════════════════════════════
// Messages
// ═══════════════════════════════════════════════════════════

message ProposeWithdrawal {
    to: Address;
    amount: Int;
}

message SignTransaction {
    txId: Int;
}

message AddSigner {
    newSigner: Address;
}

message RemoveSigner {
    signer: Address;
}

// ═══════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════

message FundsReceived {
    from: Address;
    amount: Int;
}

message WithdrawalProposed {
    txId: Int;
    to: Address;
    amount: Int;
    proposer: Address;
}

message TransactionSigned {
    txId: Int;
    signer: Address;
    signatureCount: Int;
}

message WithdrawalExecuted {
    txId: Int;
    to: Address;
    amount: Int;
}

message SignerAdded {
    signer: Address;
    newCount: Int;
}

message SignerRemoved {
    signer: Address;
    newCount: Int;
}

// ═══════════════════════════════════════════════════════════
// Structs
// ═══════════════════════════════════════════════════════════

struct PendingTransaction {
    txId: Int;
    to: Address;
    amount: Int;
    proposer: Address;
    signatureCount: Int;
    executed: Bool;
}

struct ColdWalletConfig {
    owner: Address;
    signerCount: Int;
    requiredSignatures: Int;
    nextTxId: Int;
}
