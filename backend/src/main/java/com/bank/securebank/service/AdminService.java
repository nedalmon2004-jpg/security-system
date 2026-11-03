package com.bank.securebank.service;

import com.bank.securebank.dto.AdminStatsDto;
import com.bank.securebank.dto.AdminUserDto;
import com.bank.securebank.dto.FreezeRequest;
import com.bank.securebank.dto.TransactionDto;
import com.bank.securebank.dto.UpdateRoleRequest;
import com.bank.securebank.dto.UpdateUserRequest;
import com.bank.securebank.dto.VerifyChainResponse;
import com.bank.securebank.exception.ApiException;
import com.bank.securebank.model.Account;
import com.bank.securebank.model.Transaction;
import com.bank.securebank.model.User;
import com.bank.securebank.repository.AccountRepository;
import com.bank.securebank.repository.TransactionRepository;
import com.bank.securebank.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Service
public class AdminService {

    private static final Set<String> ALLOWED_ROLES = Set.of("ROLE_USER", "ROLE_ADMIN");

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerService ledgerService;

    public AdminService(UserRepository userRepository,
                        AccountRepository accountRepository,
                        TransactionRepository transactionRepository,
                        LedgerService ledgerService) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.ledgerService = ledgerService;
    }

    @Transactional(readOnly = true)
    public AdminStatsDto stats() {
        List<Account> accounts = accountRepository.findAll();
        BigDecimal totalBalance = accounts.stream()
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long frozen = accounts.stream().filter(Account::isFrozen).count();
        VerifyChainResponse chain = ledgerService.verifyChain();

        return new AdminStatsDto(
                userRepository.count(),
                accounts.size(),
                totalBalance,
                transactionRepository.count(),
                chain.blocks(),
                chain.valid(),
                chain.message(),
                frozen);
    }

    @Transactional(readOnly = true)
    public List<AdminUserDto> users() {
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(user -> toDto(user, accountRepository.findByUserId(user.getId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransactionDto> transactions() {
        List<Transaction> transactions =
                transactionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        return transactions.stream()
                .map(t -> new TransactionDto(t.getId(), t.getType(), t.getAmount(),
                        t.getFromAccountNumber(), t.getToAccountNumber(),
                        t.getDescription(), t.getCreatedAt()))
                .toList();
    }

    @Transactional
    public AdminUserDto updateUser(String adminUsername, Long userId, UpdateUserRequest request) {
        if (request.role() == null || !ALLOWED_ROLES.contains(request.role())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role must be ROLE_USER or ROLE_ADMIN");
        }

        User user = requireUser(userId);
        String newUsername = request.username().trim();
        String newEmail = request.email().trim();

        if (user.getUsername().equals(adminUsername) && !"ROLE_ADMIN".equals(request.role())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot remove your own admin role");
        }
        if (userRepository.existsByUsernameAndIdNot(newUsername, userId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already taken");
        }
        if (userRepository.existsByEmailAndIdNot(newEmail, userId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }
        if ("ROLE_ADMIN".equals(user.getRole()) && !"ROLE_ADMIN".equals(request.role())
                && userRepository.countByRole("ROLE_ADMIN") <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot demote the last administrator");
        }

        String oldUsername = user.getUsername();
        String oldEmail = user.getEmail();
        String oldRole = user.getRole();

        user.setUsername(newUsername);
        user.setEmail(newEmail);
        user.setRole(request.role());
        userRepository.save(user);

        ledgerService.append(user.getId(), "USER_UPDATED",
                adminUsername + "|" + oldUsername + "->" + newUsername
                        + "|" + oldEmail + "->" + newEmail
                        + "|" + oldRole + "->" + request.role());

        return toDto(user, accountRepository.findByUserId(user.getId()).orElse(null));
    }

    @Transactional
    public void deleteUser(String adminUsername, Long userId) {
        User user = requireUser(userId);
        if (user.getUsername().equals(adminUsername)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
        }
        if ("ROLE_ADMIN".equals(user.getRole()) && userRepository.countByRole("ROLE_ADMIN") <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cannot delete the last administrator");
        }

        String username = user.getUsername();
        accountRepository.findByUserId(userId).ifPresent(accountRepository::delete);
        userRepository.delete(user);

        // The audit ledger is append-only: deleting a user records the event
        // instead of removing any existing blocks.
        ledgerService.append(userId, "USER_DELETED", adminUsername + "|" + username);
    }

    @Transactional
    public AdminUserDto setRole(String adminUsername, Long userId, UpdateRoleRequest request) {
        if (request.role() == null || !ALLOWED_ROLES.contains(request.role())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role must be ROLE_USER or ROLE_ADMIN");
        }

        User user = requireUser(userId);
        if (user.getUsername().equals(adminUsername)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot change your own role");
        }

        user.setRole(request.role());
        userRepository.save(user);

        ledgerService.append(user.getId(), "ROLE_CHANGED",
                adminUsername + "|" + user.getUsername() + "|" + request.role());

        return toDto(user, accountRepository.findByUserId(user.getId()).orElse(null));
    }

    @Transactional
    public AdminUserDto setFrozen(String adminUsername, Long userId, FreezeRequest request) {
        User user = requireUser(userId);
        Account account = accountRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found"));

        account.setFrozen(request.frozen());
        accountRepository.save(account);

        ledgerService.append(user.getId(),
                request.frozen() ? "ACCOUNT_FROZEN" : "ACCOUNT_UNFROZEN",
                adminUsername + "|" + user.getUsername() + "|" + account.getAccountNumber());

        return toDto(user, account);
    }

    private AdminUserDto toDto(User user, Account account) {
        return new AdminUserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt(),
                account == null ? null : account.getAccountNumber(),
                account == null ? BigDecimal.ZERO : account.getBalance(),
                account != null && account.isFrozen());
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
