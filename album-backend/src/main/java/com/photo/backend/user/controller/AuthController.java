package com.photo.backend.user.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.repository.UserRepository;
import com.photo.backend.admin.service.AdminAuditLogService;
import com.photo.backend.user.dto.AuthTokens;
import com.photo.backend.user.service.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
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

    @Value("${jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    @Value("${auth.cookie.secure:false}")
    private boolean secureCookie;

    @Value("${auth.cookie.same-site:Lax}")
    private String sameSite;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, String>>> login(
            @RequestBody Map<String, String> credentials,
            HttpServletRequest request,
            HttpServletResponse response) {
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

            AuthTokens tokens = userService.login(username, password);
            response.addHeader("Set-Cookie", refreshCookie(tokens.refreshToken()).toString());
            userRepository.findByUsername(username)
                    .ifPresent(user -> adminAuditLogService.recordAuth(user, "LOGIN_SUCCESS", user.getId(), "username=" + username, true, request));
            return ResponseEntity.ok(ApiResponse.success(Map.of("accessToken", tokens.accessToken()), "登录成功"));
        } catch (Exception e) {
            adminAuditLogService.recordAuth(null, "LOGIN_FAILED", credentials.get("username"), e.getMessage(), false, request);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("登录失败: " + e.getMessage(), "LOGIN_FAILED"));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, String>>> refresh(HttpServletRequest request, HttpServletResponse response) {
        try {
            AuthTokens tokens = userService.refresh(refreshTokenFromCookie(request));
            response.addHeader("Set-Cookie", refreshCookie(tokens.refreshToken()).toString());
            return ResponseEntity.ok(ApiResponse.success(Map.of("accessToken", tokens.accessToken()), "刷新成功"));
        } catch (Exception e) {
            response.addHeader("Set-Cookie", clearRefreshCookie().toString());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("登录已过期", "REFRESH_FAILED"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request, HttpServletResponse response) {
        userService.logout(refreshTokenFromCookieOrNull(request));
        response.addHeader("Set-Cookie", clearRefreshCookie().toString());
        return ResponseEntity.ok(ApiResponse.<Void>success("已登出"));
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

    private String refreshTokenFromCookie(HttpServletRequest request) {
        String refreshToken = refreshTokenFromCookieOrNull(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new RuntimeException("Missing refresh token");
        }
        return refreshToken;
    }

    private String refreshTokenFromCookieOrNull(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if ("refresh_token".equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private ResponseCookie refreshCookie(String refreshToken) {
        return ResponseCookie.from("refresh_token", refreshToken)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite(sameSite)
                .path("/api/auth")
                .maxAge(Duration.ofMillis(refreshExpirationMs))
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite(sameSite)
                .path("/api/auth")
                .maxAge(0)
                .build();
    }
}
