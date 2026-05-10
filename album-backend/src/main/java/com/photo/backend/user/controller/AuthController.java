package com.photo.backend.user.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.repository.UserRepository;
import com.photo.backend.admin.service.AdminAuditLogService;
import com.photo.backend.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AdminAuditLogService adminAuditLogService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, String>>> login(@RequestBody Map<String, String> credentials, HttpServletRequest request) {
        try {
            String username = credentials.get("username");
            String password = credentials.get("password");

            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("用户名不能为空", "USERNAME_REQUIRED"));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("密码不能为空", "PASSWORD_REQUIRED"));
            }

            String token = userService.login(username, password);
            userRepository.findByUsername(username)
                    .ifPresent(user -> adminAuditLogService.recordAuth(user, "LOGIN_SUCCESS", user.getId(), "username=" + username, true, request));
            return ResponseEntity.ok(ApiResponse.success(Map.of("token", token), "登录成功"));
        } catch (Exception e) {
            adminAuditLogService.recordAuth(null, "LOGIN_FAILED", credentials.get("username"), e.getMessage(), false, request);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("登录失败: " + e.getMessage(), "LOGIN_FAILED"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<User>> register(@RequestBody Map<String, String> userData, HttpServletRequest request) {
        try {
            User user = new User();
            String password = userData.get("password");
            String confirmPassword = userData.get("confirmPassword");
            if (password == null || !password.equals(confirmPassword)) {
                throw new RuntimeException("两次输入的密码不一致");
            }
            user.setUsername(userData.get("username"));
            user.setPasswordHash(password);
            user.setEmail(userData.get("email"));
            user.setNickname(userData.get("nickname") != null ? userData.get("nickname") : "");

            User registeredUser = userService.register(user);
            adminAuditLogService.recordAuth(registeredUser, "REGISTER_SUCCESS", registeredUser.getId(), "username=" + registeredUser.getUsername(), true, request);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(registeredUser, "注册成功"));
        } catch (Exception e) {
            adminAuditLogService.recordAuth(null, "REGISTER_FAILED", userData.get("username"), e.getMessage(), false, request);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("注册失败: " + e.getMessage(), "REGISTER_FAILED"));
        }
    }
}
