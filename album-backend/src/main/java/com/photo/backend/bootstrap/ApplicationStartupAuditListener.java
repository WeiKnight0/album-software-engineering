package com.photo.backend.bootstrap;

import com.photo.backend.admin.service.AdminAuditLogService;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class ApplicationStartupAuditListener {
    private final AdminAuditLogService adminAuditLogService;

    public ApplicationStartupAuditListener(AdminAuditLogService adminAuditLogService) {
        this.adminAuditLogService = adminAuditLogService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        adminAuditLogService.recordSystem("SYSTEM_STARTUP", "SYSTEM", "backend", "backend application started");
    }
}
