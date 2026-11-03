package com.bank.securebank.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminUserDto(
        Long id,
        String username,
        String email,
        String role,
        LocalDateTime createdAt,
        String accountNumber,
        BigDecimal balance,
        boolean frozen
) {
}
