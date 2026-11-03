CREATE DATABASE IF NOT EXISTS blockchain_bank
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE blockchain_bank;

CREATE TABLE IF NOT EXISTS users (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)  NOT NULL,
    email         VARCHAR(100) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'ROLE_USER',
    created_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS accounts (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    user_id        BIGINT        NOT NULL,
    account_number VARCHAR(20)   NOT NULL,
    balance        DECIMAL(19,2) NOT NULL DEFAULT 0.00,
    frozen         BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at     DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_accounts_user (user_id),
    UNIQUE KEY uk_accounts_number (account_number)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    type                VARCHAR(20)   NOT NULL,
    amount              DECIMAL(19,2) NOT NULL,
    from_account_number VARCHAR(20)   NULL,
    to_account_number   VARCHAR(20)   NULL,
    description         VARCHAR(150)  NULL,
    created_at          DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_tx_from (from_account_number),
    KEY idx_tx_to (to_account_number)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS audit_ledger (
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    block_index  BIGINT      NOT NULL,
    user_id      BIGINT      NULL,
    event_type   VARCHAR(30) NOT NULL,
    payload_hash CHAR(64)    NOT NULL,
    prev_hash    CHAR(64)    NOT NULL,
    block_hash   CHAR(64)    NOT NULL,
    created_at   DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ledger_block_index (block_index),
    UNIQUE KEY uk_ledger_block_hash (block_hash),
    KEY idx_ledger_user (user_id)
) ENGINE = InnoDB;
