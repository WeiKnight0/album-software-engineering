package com.photo.backend.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "admin_audit_log", indexes = {
    @Index(name = "idx_audit_operator_created", columnList = "operator_id, created_at"),
    @Index(name = "idx_audit_action_created", columnList = "action, created_at"),
    @Index(name = "idx_audit_category_created", columnList = "category, created_at"),
    @Index(name = "idx_audit_level_created", columnList = "level, created_at")
})
public class AdminAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_log_id")
    private Long id;

    @Column(name = "operator_id", nullable = false)
    private Integer operatorId;

    @Column(name = "operator_username", nullable = false, length = 50)
    private String operatorUsername;

    @Column(name = "action", nullable = false, length = 80)
    private String action;

    @Column(name = "level", nullable = false, length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'INFO'")
    private String level = "INFO";

    @Column(name = "category", nullable = false, length = 40, columnDefinition = "VARCHAR(40) DEFAULT 'ADMIN'")
    private String category = "ADMIN";

    @Column(name = "success", columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean success = true;

    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "target_id", length = 80)
    private String targetId;

    @Column(name = "detail", length = 1000)
    private String detail;

    @Column(name = "ip_address", length = 80)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "request_path", length = 255)
    private String requestPath;

    @Column(name = "created_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getOperatorId() { return operatorId; }
    public void setOperatorId(Integer operatorId) { this.operatorId = operatorId; }
    public String getOperatorUsername() { return operatorUsername; }
    public void setOperatorUsername(String operatorUsername) { this.operatorUsername = operatorUsername; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public String getRequestPath() { return requestPath; }
    public void setRequestPath(String requestPath) { this.requestPath = requestPath; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
