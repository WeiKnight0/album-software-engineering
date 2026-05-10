package com.photo.backend.admin.repository;

import com.photo.backend.admin.entity.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long>, JpaSpecificationExecutor<AdminAuditLog> {
    Page<AdminAuditLog> findByCategory(String category, Pageable pageable);
}
