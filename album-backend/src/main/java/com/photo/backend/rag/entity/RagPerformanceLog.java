package com.photo.backend.rag.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rag_performance_log")
public class RagPerformanceLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "operation_type", nullable = false, length = 30)
    private String operationType;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "image_id", length = 36)
    private String imageId;

    @Column(name = "vector_search_time_ms")
    private Long vectorSearchTimeMs;

    @Column(name = "llm_time_ms")
    private Long llmTimeMs;

    @Column(name = "db_time_ms")
    private Long dbTimeMs;

    @Column(name = "total_time_ms")
    private Long totalTimeMs;

    @Column(name = "result_count")
    private Integer resultCount;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "created_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOperationType() {
        return operationType;
    }

    public void setOperationType(String operationType) {
        this.operationType = operationType;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getImageId() {
        return imageId;
    }

    public void setImageId(String imageId) {
        this.imageId = imageId;
    }

    public Long getVectorSearchTimeMs() {
        return vectorSearchTimeMs;
    }

    public void setVectorSearchTimeMs(Long vectorSearchTimeMs) {
        this.vectorSearchTimeMs = vectorSearchTimeMs;
    }

    public Long getLlmTimeMs() {
        return llmTimeMs;
    }

    public void setLlmTimeMs(Long llmTimeMs) {
        this.llmTimeMs = llmTimeMs;
    }

    public Long getDbTimeMs() {
        return dbTimeMs;
    }

    public void setDbTimeMs(Long dbTimeMs) {
        this.dbTimeMs = dbTimeMs;
    }

    public Long getTotalTimeMs() {
        return totalTimeMs;
    }

    public void setTotalTimeMs(Long totalTimeMs) {
        this.totalTimeMs = totalTimeMs;
    }

    public Integer getResultCount() {
        return resultCount;
    }

    public void setResultCount(Integer resultCount) {
        this.resultCount = resultCount;
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
}
