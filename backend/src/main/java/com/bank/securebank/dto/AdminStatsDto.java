package com.bank.securebank.dto;

import java.math.BigDecimal;

public record AdminStatsDto(
        long users,
        long accounts,
        BigDecimal totalBalance,
        long transactions,
        long ledgerBlocks,
        boolean chainValid,
        String chainMessage,
        long frozenAccounts
) {
}
