## ADDED Requirements

### Requirement: Append-only coin ledger with dual flags

The system SHALL record every coin movement as an append-only transaction with type, sender, receiver, amount, locked/withdrawable flag, and reason; balances are derived from the ledger.

#### Scenario: Welcome grant

- **WHEN** a new account is created
- **THEN** the system records a 30-coin locked grant marked spend-only and never withdrawable

#### Scenario: Tamper attempt

- **WHEN** any flow attempts to set a balance directly bypassing the ledger
- **THEN** the system MUST reject it; all mutations go through ledger entries

### Requirement: Faucets pay only on validated actions

The system SHALL issue streak gifts only for completion-gated days, race winnings only for settled races, and creator payouts only via the manual fund run.

#### Scenario: Streak gift

- **WHEN** a day qualifies under completion-gating
- **THEN** the system MAY issue the configured occasional gift and log it with its reason

### Requirement: Sinks consume spendable balance

The system SHALL allow spending spendable coins on premium unlocks, staked entry, live-class seats, and tips, rejecting spends exceeding the spendable balance.

#### Scenario: Insufficient balance

- **WHEN** a student attempts a purchase exceeding spendable balance
- **THEN** the system rejects with the current balance and no ledger entry is created

### Requirement: No cash-out in V1

The system SHALL disable withdrawal of coins in V1 while retaining the withdrawable flag in the ledger for future use.

#### Scenario: Withdrawal attempt

- **WHEN** a user attempts to withdraw in V1
- **THEN** the system responds that withdrawals are unavailable
