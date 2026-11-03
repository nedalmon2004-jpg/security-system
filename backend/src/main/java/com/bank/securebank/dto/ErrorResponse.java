package com.bank.securebank.dto;

public record ErrorResponse(
        int status,
        String message
) {
}
