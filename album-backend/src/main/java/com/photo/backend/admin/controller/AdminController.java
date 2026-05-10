package com.photo.backend.admin.controller;

import com.photo.backend.admin.dto.AdminUserDTO;
import com.photo.backend.admin.entity.AdminAuditLog;
import com.photo.backend.admin.repository.AdminAuditLogRepository;
import com.photo.backend.admin.service.AdminAuditLogService;
import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.DownloadTask;
import com.photo.backend.common.entity.Permission;
import com.photo.backend.common.entity.UploadTask;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.repository.DownloadTaskRepository;
import com.photo.backend.common.repository.PermissionRepository;
import com.photo.backend.common.repository.UploadTaskRepository;
import com.photo.backend.rag.entity.RagPerformanceLog;
import com.photo.backend.rag.repository.RagPerformanceLogRepository;
import com.photo.backend.user.service.RbacService;
import com.photo.backend.user.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @Autowired
    private UserService userService;
    @Autowired
    private RbacService rbacService;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private UploadTaskRepository uploadTaskRepository;
    @Autowired
    private DownloadTaskRepository downloadTaskRepository;
    @Autowired
    private RagPerformanceLogRepository ragPerformanceLogRepository;
    @Autowired
    private AdminAuditLogRepository adminAuditLogRepository;
    @Autowired
    private AdminAuditLogService adminAuditLogService;

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminUserDTO>>> getUsers(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            User current = requirePermission(authHeader, "user:view");
            rbacService.requireAdmin(current);
            List<AdminUserDTO> users = userService.getAllUsers().stream()
                    .map(user -> AdminUserDTO.from(user, rbacService.getRoleCodes(user.getId())))
                    .toList();
            return ResponseEntity.ok(ApiResponse.success(users));
        } catch (Exception e) {
            return forbidden(e);
        }
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<AdminUserDTO>> createUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> payload) {
        try {
            User current = requirePermission(authHeader, "user:create");
            String role = stringValue(payload.get("role"), RbacService.ROLE_USER);
            String password = stringValue(payload.get("password"), null);
            String confirmPassword = stringValue(payload.get("confirmPassword"), null);
            if (password == null || !password.equals(confirmPassword)) {
                throw new RuntimeException("两次输入的密码不一致");
            }
            boolean createAdmin = RbacService.ROLE_ADMIN.equals(role);
            if (createAdmin) {
                rbacService.requireSuperAdmin(current);
            }
            User user = userService.createUser(
                    stringValue(payload.get("username"), null),
                    password,
                    stringValue(payload.get("email"), null),
                    stringValue(payload.get("nickname"), ""),
                    createAdmin,
                    false
            );
            adminAuditLogService.record(current, "INFO", "USER", "USER_CREATE", "USER", user.getId(), "role=" + role + ", username=" + user.getUsername(), true);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(AdminUserDTO.from(user, rbacService.getRoleCodes(user.getId())), "用户创建成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("创建用户失败: " + e.getMessage(), "ADMIN_CREATE_USER_FAILED"));
        }
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<AdminUserDTO>> updateStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Integer id,
            @RequestBody Map<String, Integer> payload) {
        try {
            User current = requirePermission(authHeader, "user:update");
            Integer status = payload.get("status");
            User user = userService.updateUserStatus(id, status);
            adminAuditLogService.record(current, "INFO", "USER", "USER_STATUS_UPDATE", "USER", id, "status=" + status, true);
            return ResponseEntity.ok(ApiResponse.success(AdminUserDTO.from(user, rbacService.getRoleCodes(user.getId()))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新状态失败: " + e.getMessage(), "ADMIN_UPDATE_STATUS_FAILED"));
        }
    }

    @PatchMapping("/users/{id}/membership")
    public ResponseEntity<ApiResponse<AdminUserDTO>> updateMembership(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Integer id,
            @RequestBody Map<String, Object> payload) {
        try {
            User current = requirePermission(authHeader, "user:update");
            boolean isMember = Boolean.TRUE.equals(payload.get("isMember"));
            LocalDateTime expireAt = isMember ? LocalDateTime.now().plusYears(1) : null;
            User user = userService.updateMembership(id, isMember, expireAt);
            adminAuditLogService.record(current, "INFO", "USER", "USER_MEMBERSHIP_UPDATE", "USER", id, "isMember=" + isMember + ", expireAt=" + expireAt, true);
            return ResponseEntity.ok(ApiResponse.success(AdminUserDTO.from(user, rbacService.getRoleCodes(user.getId()))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新会员失败: " + e.getMessage(), "ADMIN_UPDATE_MEMBERSHIP_FAILED"));
        }
    }

    @PatchMapping("/users/{id}/storage-limit")
    public ResponseEntity<ApiResponse<AdminUserDTO>> updateStorageLimit(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Integer id,
            @RequestBody Map<String, Long> payload) {
        try {
            User current = requirePermission(authHeader, "user:update");
            Long storageLimit = payload.get("storageLimit");
            User user = userService.updateStorageLimit(id, storageLimit);
            adminAuditLogService.record(current, "INFO", "USER", "USER_STORAGE_LIMIT_UPDATE", "USER", id, "storageLimit=" + storageLimit, true);
            return ResponseEntity.ok(ApiResponse.success(AdminUserDTO.from(user, rbacService.getRoleCodes(user.getId()))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新存储配额失败: " + e.getMessage(), "ADMIN_UPDATE_STORAGE_FAILED"));
        }
    }

    @PutMapping("/users/{id}/roles")
    public ResponseEntity<ApiResponse<AdminUserDTO>> updateRoles(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Integer id,
            @RequestBody Map<String, List<String>> payload) {
        try {
            requirePermission(authHeader, "role:assign");
            return ResponseEntity.badRequest().body(ApiResponse.error("账号角色创建后不可修改", "ROLE_CHANGE_NOT_ALLOWED"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新角色失败: " + e.getMessage(), "ADMIN_UPDATE_ROLES_FAILED"));
        }
    }

    @GetMapping("/permissions")
    public ResponseEntity<ApiResponse<List<Permission>>> getPermissions(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            requirePermission(authHeader, "role:view");
            return ResponseEntity.ok(ApiResponse.success(permissionRepository.findAll()));
        } catch (Exception e) {
            return forbidden(e);
        }
    }

    @GetMapping("/users/{id}/permissions")
    public ResponseEntity<ApiResponse<List<String>>> getUserPermissions(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Integer id) {
        try {
            requirePermission(authHeader, "role:view");
            User user = userService.getUserById(id);
            if (!rbacService.hasRole(user.getId(), RbacService.ROLE_ADMIN) || Boolean.TRUE.equals(user.getIsSuperAdmin())) {
                return ResponseEntity.ok(ApiResponse.success(List.of()));
            }
            return ResponseEntity.ok(ApiResponse.success(rbacService.getUserPermissionCodes(id)));
        } catch (Exception e) {
            return forbidden(e);
        }
    }

    @PutMapping("/users/{id}/permissions")
    public ResponseEntity<ApiResponse<List<String>>> updateUserPermissions(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Integer id,
            @RequestBody Map<String, List<String>> payload) {
        try {
            User current = requirePermission(authHeader, "role:assign");
            rbacService.requireSuperAdmin(current);
            User target = userService.getUserById(id);
            if (Boolean.TRUE.equals(target.getIsSuperAdmin())) {
                throw new RuntimeException("超级管理员拥有全部权限，无需分配");
            }
            if (!rbacService.hasRole(target.getId(), RbacService.ROLE_ADMIN)) {
                throw new RuntimeException("普通用户不需要分配后台权限");
            }
            List<String> permissions = payload.get("permissions");
            if (permissions == null) {
                throw new RuntimeException("permissions is required");
            }
            rbacService.replaceUserPermissions(id, permissions);
            adminAuditLogService.recordPermission(current, "USER_PERMISSIONS_UPDATE", id, "username=" + target.getUsername() + ", permissions=" + permissions, true);
            return ResponseEntity.ok(ApiResponse.success(rbacService.getUserPermissionCodes(id), "管理员权限更新成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("更新管理员权限失败: " + e.getMessage(), "ADMIN_UPDATE_USER_PERMISSIONS_FAILED"));
        }
    }

    @GetMapping("/logs/rag")
    public ResponseEntity<ApiResponse<List<RagPerformanceLog>>> getRagLogs(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            requirePermission(authHeader, "log:view");
            return ResponseEntity.ok(ApiResponse.success(ragPerformanceLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))));
        } catch (Exception e) {
            return forbidden(e);
        }
    }

    @GetMapping("/logs/audit")
    public ResponseEntity<ApiResponse<List<AdminAuditLog>>> getAuditLogs(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            requirePermission(authHeader, "log:view");
            return ResponseEntity.ok(ApiResponse.success(adminAuditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))));
        } catch (Exception e) {
            return forbidden(e);
        }
    }

    @GetMapping("/tasks/uploads")
    public ResponseEntity<ApiResponse<List<UploadTask>>> getUploadTasks(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            requirePermission(authHeader, "task:view");
            return ResponseEntity.ok(ApiResponse.success(uploadTaskRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))));
        } catch (Exception e) {
            return forbidden(e);
        }
    }

    @GetMapping("/tasks/downloads")
    public ResponseEntity<ApiResponse<List<DownloadTask>>> getDownloadTasks(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            requirePermission(authHeader, "task:view");
            return ResponseEntity.ok(ApiResponse.success(downloadTaskRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))));
        } catch (Exception e) {
            return forbidden(e);
        }
    }

    @GetMapping("/logs/rag/export")
    public ResponseEntity<byte[]> exportRagLogs(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User current = requirePermission(authHeader, "log:export");
        StringBuilder csv = new StringBuilder("id,operationType,userId,imageId,totalTimeMs,resultCount,errorMessage,createdAt\n");
        for (RagPerformanceLog log : ragPerformanceLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))) {
            csv.append(log.getId()).append(',')
                    .append(escape(log.getOperationType())).append(',')
                    .append(log.getUserId()).append(',')
                    .append(escape(log.getImageId())).append(',')
                    .append(log.getTotalTimeMs()).append(',')
                    .append(log.getResultCount()).append(',')
                    .append(escape(log.getErrorMessage())).append(',')
                    .append(log.getCreatedAt()).append('\n');
        }
        adminAuditLogService.record(current, "INFO", "RAG", "RAG_LOG_EXPORT", "LOG", "rag", "exported rag logs", true);
        return csvResponse(csv.toString(), "rag-logs.csv");
    }

    @GetMapping("/logs/audit/export")
    public ResponseEntity<byte[]> exportAuditLogs(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User current = requirePermission(authHeader, "log:export");
        StringBuilder csv = new StringBuilder("id,level,category,success,operatorId,operatorUsername,action,targetType,targetId,detail,ipAddress,requestPath,createdAt\n");
        for (AdminAuditLog log : adminAuditLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))) {
            csv.append(log.getId()).append(',')
                    .append(escape(log.getLevel())).append(',')
                    .append(escape(log.getCategory())).append(',')
                    .append(log.getSuccess()).append(',')
                    .append(log.getOperatorId()).append(',')
                    .append(escape(log.getOperatorUsername())).append(',')
                    .append(escape(log.getAction())).append(',')
                    .append(escape(log.getTargetType())).append(',')
                    .append(escape(log.getTargetId())).append(',')
                    .append(escape(log.getDetail())).append(',')
                    .append(escape(log.getIpAddress())).append(',')
                    .append(escape(log.getRequestPath())).append(',')
                    .append(log.getCreatedAt()).append('\n');
        }
        adminAuditLogService.record(current, "INFO", "ADMIN", "AUDIT_LOG_EXPORT", "LOG", "audit", "exported audit logs", true);
        return csvResponse(csv.toString(), "audit-logs.csv");
    }

    @GetMapping("/tasks/uploads/export")
    public ResponseEntity<byte[]> exportUploadTasks(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User current = requirePermission(authHeader, "task:export");
        StringBuilder csv = new StringBuilder("id,userId,taskName,totalFiles,totalSize,uploadedFiles,uploadedSize,status,createdAt,completedAt\n");
        for (UploadTask task : uploadTaskRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))) {
            csv.append(escape(task.getId())).append(',')
                    .append(task.getUserId()).append(',')
                    .append(escape(task.getTaskName())).append(',')
                    .append(task.getTotalFiles()).append(',')
                    .append(task.getTotalSize()).append(',')
                    .append(task.getUploadedFiles()).append(',')
                    .append(task.getUploadedSize()).append(',')
                    .append(task.getStatus()).append(',')
                    .append(task.getCreatedAt()).append(',')
                    .append(task.getCompletedAt()).append('\n');
        }
        adminAuditLogService.recordTask(current, "UPLOAD_TASK_EXPORT", "upload", "exported upload tasks", true);
        return csvResponse(csv.toString(), "upload-tasks.csv");
    }

    @GetMapping("/tasks/downloads/export")
    public ResponseEntity<byte[]> exportDownloadTasks(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User current = requirePermission(authHeader, "task:export");
        StringBuilder csv = new StringBuilder("id,userId,taskName,totalFiles,totalSize,downloadedFiles,downloadedSize,status,createdAt,completedAt\n");
        for (DownloadTask task : downloadTaskRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))) {
            csv.append(escape(task.getId())).append(',')
                    .append(task.getUserId()).append(',')
                    .append(escape(task.getTaskName())).append(',')
                    .append(task.getTotalFiles()).append(',')
                    .append(task.getTotalSize()).append(',')
                    .append(task.getDownloadedFiles()).append(',')
                    .append(task.getDownloadedSize()).append(',')
                    .append(task.getStatus()).append(',')
                    .append(task.getCreatedAt()).append(',')
                    .append(task.getCompletedAt()).append('\n');
        }
        adminAuditLogService.recordTask(current, "DOWNLOAD_TASK_EXPORT", "download", "exported download tasks", true);
        return csvResponse(csv.toString(), "download-tasks.csv");
    }

    private User requirePermission(String authHeader, String permissionCode) {
        User current = userService.getUserFromAuthHeader(authHeader);
        rbacService.requireAdmin(current);
        rbacService.requirePermission(current, permissionCode);
        return current;
    }

    private String stringValue(Object value, String defaultValue) {
        if (value == null) return defaultValue;
        String text = value.toString().trim();
        return text.isEmpty() ? defaultValue : text;
    }

    private String escape(Object value) {
        if (value == null) return "";
        String text = value.toString().replace("\"", "\"\"");
        return "\"" + text + "\"";
    }

    private ResponseEntity<byte[]> csvResponse(String csv, String filename) {
        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(bytes);
    }

    private <T> ResponseEntity<ApiResponse<T>> forbidden(Exception e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("权限不足: " + e.getMessage(), "FORBIDDEN"));
    }
}
