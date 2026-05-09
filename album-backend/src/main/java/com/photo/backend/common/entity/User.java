package com.photo.backend.common.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "User", indexes = {
    @Index(name = "idx_username", columnList = "username"),
    @Index(name = "idx_email", columnList = "email"),
    @Index(name = "idx_member_status", columnList = "is_member, membership_expire_at")
})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false)
    private Integer id;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "nickname", length = 50, columnDefinition = "VARCHAR(50) DEFAULT ''")
    private String nickname = "";

    @Column(name = "is_member", columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isMember = false;

    @Column(name = "membership_expire_at")
    private LocalDateTime membershipExpireAt;

    @Column(name = "status", columnDefinition = "TINYINT DEFAULT 1")
    private Integer status = 1;

    @Column(name = "is_super_admin", columnDefinition = "TINYINT(1) DEFAULT 0")
    private Boolean isSuperAdmin = false;

    @Column(name = "storage_used", columnDefinition = "BIGINT DEFAULT 0")
    private Long storageUsed = 0L;

    @Column(name = "storage_limit", columnDefinition = "BIGINT DEFAULT 1073741824")
    private Long storageLimit = 1073741824L;

    @Column(name = "created_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime updatedAt;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public Boolean getIsMember() {
        return isMember;
    }

    public void setIsMember(Boolean isMember) {
        this.isMember = isMember;
    }

    public LocalDateTime getMembershipExpireAt() {
        return membershipExpireAt;
    }

    public void setMembershipExpireAt(LocalDateTime membershipExpireAt) {
        this.membershipExpireAt = membershipExpireAt;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public Boolean getIsSuperAdmin() {
        return isSuperAdmin;
    }

    public void setIsSuperAdmin(Boolean isSuperAdmin) {
        this.isSuperAdmin = isSuperAdmin;
    }

    public Long getStorageUsed() {
        return storageUsed;
    }

    public void setStorageUsed(Long storageUsed) {
        this.storageUsed = storageUsed;
    }

    public Long getStorageLimit() {
        return storageLimit;
    }

    public void setStorageLimit(Long storageLimit) {
        this.storageLimit = storageLimit;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
