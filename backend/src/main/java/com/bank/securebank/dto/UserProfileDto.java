package com.bank.securebank.dto;

import java.time.LocalDateTime;

public record UserProfileDto(
        Long id,
        String username,
        String email,
        String role,
        LocalDateTime createdAt
) {
}
