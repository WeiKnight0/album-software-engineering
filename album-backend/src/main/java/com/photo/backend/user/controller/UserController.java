package com.photo.backend.user.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.User;
import com.photo.backend.user.dto.CurrentUserDTO;
import com.photo.backend.user.service.CurrentUserService;
import com.photo.backend.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserService userService;

    @Autowired
    private CurrentUserService currentUserService;

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
            return ResponseEntity.ok(ApiResponse.success(userService.getCurrentUserDTO(updatedUser), "用户更新成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("更新失败: " + e.getMessage(), "UPDATE_FAILED"));
        }
    }
}
