CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash TEXT NOT NULL,
    payment_number VARCHAR(20),
    balance NUMERIC(12,2) DEFAULT 0.00, -- ✅ For current balance
    signup_bonus NUMERIC(12,2) DEFAULT 0.00, -- ✅ To track given bonus
    country VARCHAR(50) DEFAULT 'BD',
    currency VARCHAR(10) DEFAULT 'BDT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- deposit, withdraw, game_win, game_loss, signup_bonus
    amount NUMERIC(12,2) NOT NULL,
    balance_after NUMERIC(12,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transfer_id VARCHAR(100) UNIQUE
);
