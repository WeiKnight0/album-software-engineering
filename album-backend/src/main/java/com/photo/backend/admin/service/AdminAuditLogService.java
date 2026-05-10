package com.photo.backend.admin.service;

import com.photo.backend.admin.entity.AdminAuditLog;
import com.photo.backend.admin.repository.AdminAuditLogRepository;
import com.photo.backend.common.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AdminAuditLogService {
    @Autowired
    private AdminAuditLogRepository adminAuditLogRepository;

    public void record(User operator, String action, String targetType, Object targetId, String detail) {
        record(operator, "INFO", "ADMIN", action, targetType, targetId, detail, true, null);
    }

    public void record(User operator, String level, String category, String action, String targetType, Object targetId, String detail, boolean success) {
        record(operator, level, category, action, targetType, targetId, detail, success, null);
    }

    public void record(User operator, String level, String category, String action, String targetType, Object targetId, String detail, boolean success, HttpServletRequest request) {
        AdminAuditLog log = new AdminAuditLog();
        log.setOperatorId(operator != null ? operator.getId() : 0);
        log.setOperatorUsername(operator != null ? operator.getUsername() : "SYSTEM");
        log.setLevel(level);
        log.setCategory(category);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId == null ? null : targetId.toString());
        log.setDetail(detail);
        log.setSuccess(success);
        if (request != null) {
            log.setIpAddress(resolveClientIp(request));
            log.setUserAgent(request.getHeader("User-Agent"));
            log.setRequestPath(request.getRequestURI());
        }
        adminAuditLogRepository.save(log);
    }

    public void recordSystem(String action, String targetType, Object targetId, String detail) {
        record(null, "INFO", "SYSTEM", action, targetType, targetId, detail, true, null);
    }

    public void recordAuth(User operator, String action, Object targetId, String detail, boolean success, HttpServletRequest request) {
        record(operator, success ? "INFO" : "WARN", "AUTH", action, "USER", targetId, detail, success, request);
    }

    public void recordTask(User operator, String action, Object targetId, String detail, boolean success) {
        record(operator, success ? "INFO" : "ERROR", "TASK", action, "TASK", targetId, detail, success, null);
    }

    public void recordPermission(User operator, String action, Object targetId, String detail, boolean success) {
        record(operator, success ? "SECURITY" : "WARN", "PERMISSION", action, "USER", targetId, detail, success, null);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
