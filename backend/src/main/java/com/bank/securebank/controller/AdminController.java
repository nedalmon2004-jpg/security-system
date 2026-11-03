package com.bank.securebank.controller;

import com.bank.securebank.dto.AdminStatsDto;
import com.bank.securebank.dto.AdminUserDto;
import com.bank.securebank.dto.FreezeRequest;
import com.bank.securebank.dto.TransactionDto;
import com.bank.securebank.dto.UpdateRoleRequest;
import com.bank.securebank.dto.UpdateUserRequest;
import com.bank.securebank.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return adminService.stats();
    }

    @GetMapping("/users")
    public List<AdminUserDto> users() {
        return adminService.users();
    }

    @GetMapping("/transactions")
    public List<TransactionDto> transactions() {
        return adminService.transactions();
    }

    @PutMapping("/users/{userId}")
    public AdminUserDto updateUser(Authentication authentication,
                                   @PathVariable Long userId,
                                   @Valid @RequestBody UpdateUserRequest request) {
        return adminService.updateUser(authentication.getName(), userId, request);
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Map<String, String>> deleteUser(Authentication authentication,
                                                          @PathVariable Long userId) {
        adminService.deleteUser(authentication.getName(), userId);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    @PostMapping("/users/{userId}/role")
    public AdminUserDto updateRole(Authentication authentication,
                                   @PathVariable Long userId,
                                   @Valid @RequestBody UpdateRoleRequest request) {
        return adminService.setRole(authentication.getName(), userId, request);
    }

    @PostMapping("/users/{userId}/freeze")
    public AdminUserDto updateFrozen(Authentication authentication,
                                     @PathVariable Long userId,
                                     @RequestBody FreezeRequest request) {
        return adminService.setFrozen(authentication.getName(), userId, request);
    }
}
