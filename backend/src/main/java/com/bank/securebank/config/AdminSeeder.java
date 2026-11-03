package com.bank.securebank.config;

import com.bank.securebank.model.User;
import com.bank.securebank.repository.UserRepository;
import com.bank.securebank.service.BankingService;
import com.bank.securebank.service.LedgerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BankingService bankingService;
    private final LedgerService ledgerService;
    private final String adminUsername;
    private final String adminPassword;

    public AdminSeeder(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       BankingService bankingService,
                       LedgerService ledgerService,
                       @Value("${admin.username:admin}") String adminUsername,
                       @Value("${admin.password:Admin123!}") String adminPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.bankingService = bankingService;
        this.ledgerService = ledgerService;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (adminUsername == null || adminUsername.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.warn("Admin bootstrap skipped: admin.username/admin.password not configured");
            return;
        }

        User existing = userRepository.findByUsername(adminUsername).orElse(null);
        if (existing != null) {
            if (!"ROLE_ADMIN".equals(existing.getRole())) {
                existing.setRole("ROLE_ADMIN");
                userRepository.save(existing);
                ledgerService.append(existing.getId(), "ROLE_CHANGED",
                        "system|" + existing.getUsername() + "|ROLE_ADMIN");
                log.info("Promoted existing user '{}' to administrator", adminUsername);
            }
            return;
        }

        User admin = new User();
        admin.setUsername(adminUsername);
        admin.setEmail(adminUsername + "@securebank.local");
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setRole("ROLE_ADMIN");
        User saved = userRepository.save(admin);

        bankingService.getOrCreateAccount(saved);
        ledgerService.append(saved.getId(), "ADMIN_CREATED", saved.getUsername());

        log.info("Created bootstrap administrator '{}'", adminUsername);
    }
}
