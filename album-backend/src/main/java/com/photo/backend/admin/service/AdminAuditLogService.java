package com.photo.backend.admin.service;

import com.photo.backend.admin.entity.AdminAuditLog;
import com.photo.backend.admin.repository.AdminAuditLogRepository;
import com.photo.backend.common.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AdminAuditLogService {
    @Autowired
    private AdminAuditLogRepository adminAuditLogRepository;

    public void record(User operator, String action, String targetType, Object targetId, String detail) {
        AdminAuditLog log = new AdminAuditLog();
        log.setOperatorId(operator.getId());
        log.setOperatorUsername(operator.getUsername());
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId == null ? null : targetId.toString());
        log.setDetail(detail);
        adminAuditLogRepository.save(log);
    }
}
