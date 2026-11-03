package com.bank.securebank.dto;

public record VerifyChainResponse(
        boolean valid,
        long blocks,
        String message
) {
}
