package com.bank.securebank.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AccountDto(
        String accountNumber,
        BigDecimal balance,
        boolean frozen,
        LocalDateTime createdAt
) {
}
