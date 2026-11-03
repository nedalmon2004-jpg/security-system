package com.bank.securebank.controller;

import com.bank.securebank.dto.AccountDto;
import com.bank.securebank.dto.BankingRequest;
import com.bank.securebank.dto.TransactionDto;
import com.bank.securebank.service.BankingService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final BankingService bankingService;

    public AccountController(BankingService bankingService) {
        this.bankingService = bankingService;
    }

    @GetMapping
    public AccountDto account(Authentication authentication) {
        return bankingService.getAccount(authentication.getName());
    }

    @PostMapping("/deposit")
    public AccountDto deposit(Authentication authentication,
                              @Valid @RequestBody BankingRequest request) {
        return bankingService.deposit(authentication.getName(), request);
    }

    @PostMapping("/withdraw")
    public AccountDto withdraw(Authentication authentication,
                               @Valid @RequestBody BankingRequest request) {
        return bankingService.withdraw(authentication.getName(), request);
    }

    @PostMapping("/transfer")
    public AccountDto transfer(Authentication authentication,
                               @Valid @RequestBody BankingRequest request) {
        return bankingService.transfer(authentication.getName(), request);
    }

    @GetMapping("/transactions")
    public List<TransactionDto> transactions(Authentication authentication) {
        return bankingService.getTransactions(authentication.getName());
    }
}
