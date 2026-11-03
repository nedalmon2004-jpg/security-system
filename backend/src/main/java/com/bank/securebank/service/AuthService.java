package com.bank.securebank.service;

import com.bank.securebank.dto.AuthResponse;
import com.bank.securebank.dto.LoginRequest;
import com.bank.securebank.dto.RegisterRequest;
import com.bank.securebank.exception.ApiException;
import com.bank.securebank.model.User;
import com.bank.securebank.repository.UserRepository;
import com.bank.securebank.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LedgerService ledgerService;
    private final BankingService bankingService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       LedgerService ledgerService,
                       BankingService bankingService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.ledgerService = ledgerService;
        this.bankingService = bankingService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new ApiException(HttpStatus.CONFLICT, "Username already taken");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        // Only the BCrypt hash of the password is stored, never the raw password.
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole("ROLE_USER");

        User saved = userRepository.save(user);

        // Every new user gets a bank account with a zero balance.
        bankingService.getOrCreateAccount(saved);

        ledgerService.append(saved.getId(), "REGISTER",
                saved.getUsername() + "|" + saved.getEmail());

        String token = jwtService.generateToken(saved.getUsername(), saved.getRole());
        return new AuthResponse(token, saved.getUsername(), saved.getRole());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        boolean matches = passwordEncoder.matches(request.password(), user.getPasswordHash());
        if (!matches) {
            ledgerService.append(user.getId(), "LOGIN_FAILED", user.getUsername());
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        ledgerService.append(user.getId(), "LOGIN_SUCCESS", user.getUsername());

        String token = jwtService.generateToken(user.getUsername(), user.getRole());
        return new AuthResponse(token, user.getUsername(), user.getRole());
    }
}
