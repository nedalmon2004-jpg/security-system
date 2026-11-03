package com.bank.securebank.controller;

import com.bank.securebank.dto.ChangePasswordRequest;
import com.bank.securebank.dto.UserProfileDto;
import com.bank.securebank.model.AuditBlock;
import com.bank.securebank.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public UserProfileDto profile(Authentication authentication) {
        return profileService.getProfile(authentication.getName());
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        profileService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    @GetMapping("/login-history")
    public List<AuditBlock> loginHistory(Authentication authentication) {
        return profileService.getLoginHistory(authentication.getName());
    }
}
