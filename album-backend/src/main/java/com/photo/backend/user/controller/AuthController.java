package com.photo.backend.user.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.User;
import com.photo.backend.user.service.UserService;
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

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, String>>> login(@RequestBody Map<String, String> credentials) {
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
            return ResponseEntity.ok(ApiResponse.success(Map.of("token", token), "登录成功"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("登录失败: " + e.getMessage(), "LOGIN_FAILED"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<User>> register(@RequestBody Map<String, String> userData) {
        try {
            User user = new User();
            user.setUsername(userData.get("username"));
            user.setPasswordHash(userData.get("password"));
            user.setEmail(userData.get("email"));
            user.setNickname(userData.get("nickname") != null ? userData.get("nickname") : "");

            User registeredUser = userService.register(user);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(registeredUser, "注册成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("注册失败: " + e.getMessage(), "REGISTER_FAILED"));
        }
    }
}
