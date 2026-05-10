package com.photo.backend.ai.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_chat_message", indexes = {
    @Index(name = "idx_ai_message_session_created", columnList = "session_id, created_at"),
    @Index(name = "idx_ai_message_user_created", columnList = "user_id, created_at")
})
public class AiChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "role", nullable = false, length = 20)
    private String role;

    @Column(name = "content", nullable = false, length = 8000)
    private String content;

    @Column(name = "references_json", length = 8000)
    private String referencesJson;

    @Column(name = "created_at", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getReferencesJson() { return referencesJson; }
    public void setReferencesJson(String referencesJson) { this.referencesJson = referencesJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
