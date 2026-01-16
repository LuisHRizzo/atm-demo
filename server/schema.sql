CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    rent_model VARCHAR(50),
    base_rent DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS terminals (
    sn VARCHAR(50) PRIMARY KEY,
    atm_id VARCHAR(100),
    location_id VARCHAR(50),
    cash_on_hand DECIMAL(15, 2),
    last_online DATETIME,
    status VARCHAR(50),
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(100) PRIMARY KEY,
    terminal_sn VARCHAR(50),
    timestamp DATETIME,
    type VARCHAR(20),
    amount_cash DECIMAL(15, 2),
    amount_crypto DECIMAL(20, 8),
    exchange_price DECIMAL(15, 2),
    markup_percent DECIMAL(5, 4),
    fixed_fee DECIMAL(10, 2),
    status VARCHAR(50),
    gross_profit DECIMAL(15, 2),
    source VARCHAR(20) DEFAULT 'OTHER',
    period VARCHAR(20) DEFAULT 'UNKNOWN',
    metadata JSON,
    FOREIGN KEY (terminal_sn) REFERENCES terminals(sn) ON DELETE CASCADE
);