package com.photo.backend.common.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ImageAnalysis", indexes = {
    @Index(name = "idx_image_analysis_user", columnList = "user_id"),
    @Index(name = "idx_image_analysis_image", columnList = "image_id"),
    @Index(name = "idx_image_analysis_status", columnList = "status")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uq_image_analysis", columnNames = {"image_id", "analysis_type"})
})
public class ImageAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_analysis_id")
    private Integer id;

    @Column(name = "image_id", nullable = false, length = 36)
    private String imageId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "analysis_type", nullable = false, length = 20)
    private String analysisType = "VECTOR";

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "created_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.updatedAt = LocalDateTime.now();
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getImageId() {
        return imageId;
    }

    public void setImageId(String imageId) {
        this.imageId = imageId;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getAnalysisType() {
        return analysisType;
    }

    public void setAnalysisType(String analysisType) {
        this.analysisType = analysisType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
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
