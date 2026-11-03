package com.bank.securebank.service;

import com.bank.securebank.dto.AccountDto;
import com.bank.securebank.dto.BankingRequest;
import com.bank.securebank.dto.TransactionDto;
import com.bank.securebank.exception.ApiException;
import com.bank.securebank.model.Account;
import com.bank.securebank.model.Transaction;
import com.bank.securebank.model.TransactionType;
import com.bank.securebank.model.User;
import com.bank.securebank.repository.AccountRepository;
import com.bank.securebank.repository.TransactionRepository;
import com.bank.securebank.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.util.List;

@Service
public class BankingService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerService ledgerService;

    public BankingService(UserRepository userRepository,
                          AccountRepository accountRepository,
                          TransactionRepository transactionRepository,
                          LedgerService ledgerService) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerService = ledgerService;
    }

    @Transactional
    public Account getOrCreateAccount(User user) {
        return accountRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Account account = new Account();
                    account.setUserId(user.getId());
                    account.setAccountNumber(generateAccountNumber());
                    account.setBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_EVEN));
                    Account saved = accountRepository.save(account);
                    ledgerService.append(user.getId(), "ACCOUNT_CREATED",
                            saved.getAccountNumber() + "|" + user.getUsername());
                    return saved;
                });
    }

    @Transactional
    public AccountDto getAccount(String username) {
        User user = requireUser(username);
        Account account = getOrCreateAccount(user);
        return new AccountDto(account.getAccountNumber(), account.getBalance(), account.isFrozen(), account.getCreatedAt());
    }

    @Transactional
    public AccountDto deposit(String username, BankingRequest request) {
        User user = requireUser(username);
        BigDecimal amount = normalize(request.amount());
        getOrCreateAccount(user);
        Account account = accountRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found"));

        if (account.isFrozen()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is frozen");
        }
        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);

        saveTransaction(TransactionType.DEPOSIT, amount,
                null, account.getAccountNumber(), request.description());

        ledgerService.append(user.getId(), "DEPOSIT",
                username + "|" + amount.toPlainString() + "|" + account.getBalance().toPlainString());

        return new AccountDto(account.getAccountNumber(), account.getBalance(), account.isFrozen(), account.getCreatedAt());
    }

    @Transactional
    public AccountDto withdraw(String username, BankingRequest request) {
        User user = requireUser(username);
        BigDecimal amount = normalize(request.amount());
        getOrCreateAccount(user);
        Account account = accountRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found"));

        if (account.isFrozen()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is frozen");
        }
        if (account.getBalance().compareTo(amount) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Insufficient funds");
        }

        account.setBalance(account.getBalance().subtract(amount));
        accountRepository.save(account);

        saveTransaction(TransactionType.WITHDRAW, amount,
                account.getAccountNumber(), null, request.description());

        ledgerService.append(user.getId(), "WITHDRAW",
                username + "|" + amount.toPlainString() + "|" + account.getBalance().toPlainString());

        return new AccountDto(account.getAccountNumber(), account.getBalance(), account.isFrozen(), account.getCreatedAt());
    }

    @Transactional
    public AccountDto transfer(String username, BankingRequest request) {
        User user = requireUser(username);
        BigDecimal amount = normalize(request.amount());
        String targetNumber = request.toAccountNumber();
        if (targetNumber == null || targetNumber.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Destination account number is required");
        }

        getOrCreateAccount(user);
        Account source = accountRepository.findByUserIdForUpdate(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found"));

        if (source.isFrozen()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is frozen");
        }
        if (source.getAccountNumber().equals(targetNumber)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot transfer to your own account");
        }
        if (source.getBalance().compareTo(amount) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Insufficient funds");
        }

        Account target = accountRepository.findByAccountNumberForUpdate(targetNumber)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Destination account not found"));
        if (target.isFrozen()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Destination account is frozen");
        }

        source.setBalance(source.getBalance().subtract(amount));
        target.setBalance(target.getBalance().add(amount));
        accountRepository.save(source);
        accountRepository.save(target);

        saveTransaction(TransactionType.TRANSFER, amount,
                source.getAccountNumber(), target.getAccountNumber(), request.description());

        ledgerService.append(user.getId(), "TRANSFER",
                username + "|" + amount.toPlainString() + "|" + source.getAccountNumber()
                        + "->" + target.getAccountNumber());

        return new AccountDto(source.getAccountNumber(), source.getBalance(), source.isFrozen(), source.getCreatedAt());
    }

    @Transactional
    public List<TransactionDto> getTransactions(String username) {
        User user = requireUser(username);
        Account account = getOrCreateAccount(user);

        String own = account.getAccountNumber();
        return transactionRepository
                .findByFromAccountNumberOrToAccountNumberOrderByCreatedAtDesc(own, own)
                .stream()
                .map(t -> {
                    // A single TRANSFER row is shown from the viewer's perspective.
                    TransactionType type = t.getType();
                    if (type == TransactionType.TRANSFER) {
                        type = own.equals(t.getFromAccountNumber())
                                ? TransactionType.TRANSFER_OUT
                                : TransactionType.TRANSFER_IN;
                    }
                    return new TransactionDto(t.getId(), type, t.getAmount(),
                            t.getFromAccountNumber(), t.getToAccountNumber(),
                            t.getDescription(), t.getCreatedAt());
                })
                .toList();
    }

    private void saveTransaction(TransactionType type, BigDecimal amount,
                                 String from, String to, String description) {
        Transaction transaction = new Transaction();
        transaction.setType(type);
        transaction.setAmount(amount);
        transaction.setFromAccountNumber(from);
        transaction.setToAccountNumber(to);
        transaction.setDescription(description == null || description.isBlank() ? null : description);
        transactionRepository.save(transaction);
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private BigDecimal normalize(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Amount must be greater than zero");
        }
        return amount.setScale(2, RoundingMode.HALF_EVEN);
    }

    private String generateAccountNumber() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = String.format("%012d", Math.abs(RANDOM.nextLong()) % 1_000_000_000_000L);
            if (!accountRepository.existsByAccountNumber(candidate)) {
                return candidate;
            }
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not generate account number");
    }
}
