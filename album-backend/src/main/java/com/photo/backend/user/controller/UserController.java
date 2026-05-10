package com.photo.backend.user.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.User;
import com.photo.backend.admin.service.AdminAuditLogService;
import com.photo.backend.user.dto.CurrentUserDTO;
import com.photo.backend.user.service.CurrentUserService;
import com.photo.backend.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.io.InputStream;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserService userService;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private AdminAuditLogService adminAuditLogService;

    // [新增] 根据 Token 获取当前登录用户信息（包含会员状态）
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUserDTO>> getCurrentUser() {
        try {
            User user = userService.getUserById(currentUserService.getCurrentUserId());
            return ResponseEntity.ok(ApiResponse.success(userService.getCurrentUserDTO(user)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("获取用户信息失败: " + e.getMessage(), "GET_USER_FAILED"));
        }
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<CurrentUserDTO>> updateCurrentUser(@RequestBody User user) {
        try {
            User updatedUser = userService.updateUser(currentUserService.getCurrentUserId(), user);
            adminAuditLogService.record(updatedUser, "INFO", "USER", "USER_PROFILE_UPDATE", "USER", updatedUser.getId(), "profile updated", true);
            return ResponseEntity.ok(ApiResponse.success(userService.getCurrentUserDTO(updatedUser), "用户更新成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("更新失败: " + e.getMessage(), "UPDATE_FAILED"));
        }
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(@RequestBody PasswordUpdateRequest request) {
        try {
            userService.updatePassword(
                    currentUserService.getCurrentUserId(),
                    request.currentPassword(),
                    request.newPassword()
            );
            User user = userService.getUserById(currentUserService.getCurrentUserId());
            adminAuditLogService.record(user, "SECURITY", "USER", "USER_PASSWORD_UPDATE", "USER", user.getId(), "password updated", true);
            return ResponseEntity.ok(ApiResponse.<Void>success("密码修改成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("密码修改失败: " + e.getMessage(), "PASSWORD_UPDATE_FAILED"));
        }
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<CurrentUserDTO>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        try {
            User updatedUser = userService.uploadAvatar(currentUserService.getCurrentUserId(), file);
            adminAuditLogService.record(updatedUser, "INFO", "USER", "USER_AVATAR_UPDATE", "USER", updatedUser.getId(), "avatar updated", true);
            return ResponseEntity.ok(ApiResponse.success(userService.getCurrentUserDTO(updatedUser), "头像更新成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("头像更新失败: " + e.getMessage(), "AVATAR_UPDATE_FAILED"));
        }
    }

    @GetMapping("/me/avatar")
    public ResponseEntity<byte[]> getAvatar() {
        try {
            Path avatarPath = userService.getAvatarPath(currentUserService.getCurrentUserId());
            if (avatarPath == null) {
                InputStream fallback = getClass().getResourceAsStream("/static/default-avatar.webp");
                if (fallback == null) {
                    return ResponseEntity.notFound().build();
                }
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType("image/webp"))
                        .body(fallback.readAllBytes());
            }
            String contentType = Files.probeContentType(avatarPath);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/jpeg"))
                    .body(Files.readAllBytes(avatarPath));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    public record PasswordUpdateRequest(String currentPassword, String newPassword) {}
}
