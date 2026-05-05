package com.photo.backend.common.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "UploadTask", indexes = {
    @Index(name = "idx_user_status", columnList = "user_id, status"),
    @Index(name = "idx_user_created", columnList = "user_id, created_at")
})
public class UploadTask {
    @Id
    @Column(name = "upload_task_id", nullable = false, length = 36)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "task_name", nullable = false, length = 255)
    private String taskName;

    @Column(name = "total_files", nullable = false)
    private Integer totalFiles = 0;

    @Column(name = "total_size", nullable = false)
    private Long totalSize = 0L;

    @Column(name = "uploaded_files", nullable = false)
    private Integer uploadedFiles = 0;

    @Column(name = "uploaded_size", nullable = false)
    private Long uploadedSize = 0L;

    @Column(name = "status", nullable = false, columnDefinition = "TINYINT DEFAULT 1")
    private Integer status = 1;

    @Column(name = "created_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "updated_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime updatedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public Integer getTotalFiles() {
        return totalFiles;
    }

    public void setTotalFiles(Integer totalFiles) {
        this.totalFiles = totalFiles;
    }

    public Long getTotalSize() {
        return totalSize;
    }

    public void setTotalSize(Long totalSize) {
        this.totalSize = totalSize;
    }

    public Integer getUploadedFiles() {
        return uploadedFiles;
    }

    public void setUploadedFiles(Integer uploadedFiles) {
        this.uploadedFiles = uploadedFiles;
    }

    public Long getUploadedSize() {
        return uploadedSize;
    }

    public void setUploadedSize(Long uploadedSize) {
        this.uploadedSize = uploadedSize;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
