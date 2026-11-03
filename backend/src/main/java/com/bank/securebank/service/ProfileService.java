package com.bank.securebank.service;

import com.bank.securebank.dto.ChangePasswordRequest;
import com.bank.securebank.dto.UserProfileDto;
import com.bank.securebank.exception.ApiException;
import com.bank.securebank.model.AuditBlock;
import com.bank.securebank.model.User;
import com.bank.securebank.repository.AuditBlockRepository;
import com.bank.securebank.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProfileService {

    private static final List<String> LOGIN_EVENTS = List.of("LOGIN_SUCCESS", "LOGIN_FAILED");

    private final UserRepository userRepository;
    private final AuditBlockRepository auditBlockRepository;
    private final PasswordEncoder passwordEncoder;
    private final LedgerService ledgerService;

    public ProfileService(UserRepository userRepository,
                          AuditBlockRepository auditBlockRepository,
                          PasswordEncoder passwordEncoder,
                          LedgerService ledgerService) {
        this.userRepository = userRepository;
        this.auditBlockRepository = auditBlockRepository;
        this.passwordEncoder = passwordEncoder;
        this.ledgerService = ledgerService;
    }

    @Transactional(readOnly = true)
    public UserProfileDto getProfile(String username) {
        User user = requireUser(username);
        return new UserProfileDto(user.getId(), user.getUsername(), user.getEmail(),
                user.getRole(), user.getCreatedAt());
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = requireUser(username);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            ledgerService.append(user.getId(), "PASSWORD_CHANGE_FAILED", username);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New password must be different");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        ledgerService.append(user.getId(), "PASSWORD_CHANGED", username);
    }

    @Transactional(readOnly = true)
    public List<AuditBlock> getLoginHistory(String username) {
        User user = requireUser(username);
        return auditBlockRepository
                .findByUserIdAndEventTypeInOrderByBlockIndexDesc(user.getId(), LOGIN_EVENTS);
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
