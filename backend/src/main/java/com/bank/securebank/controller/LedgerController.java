package com.bank.securebank.controller;

import com.bank.securebank.dto.VerifyChainResponse;
import com.bank.securebank.model.AuditBlock;
import com.bank.securebank.service.LedgerService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ledger")
public class LedgerController {

    private final LedgerService ledgerService;

    public LedgerController(LedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    @GetMapping
    public List<AuditBlock> getChain() {
        return ledgerService.getChain();
    }

    @GetMapping("/verify")
    public VerifyChainResponse verify() {
        return ledgerService.verifyChain();
    }
}
