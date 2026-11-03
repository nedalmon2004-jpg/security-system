package com.bank.securebank.dto;

import com.bank.securebank.model.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionDto(
        Long id,
        TransactionType type,
        BigDecimal amount,
        String fromAccountNumber,
        String toAccountNumber,
        String description,
        LocalDateTime createdAt
) {
}
