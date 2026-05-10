package com.photo.backend.ai.dto;

import com.photo.backend.ai.entity.AiChatSession;
import java.time.LocalDateTime;

public class AiChatSessionDTO {
    private Long id;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AiChatSessionDTO from(AiChatSession session) {
        AiChatSessionDTO dto = new AiChatSessionDTO();
        dto.setId(session.getId());
        dto.setTitle(session.getTitle());
        dto.setCreatedAt(session.getCreatedAt());
        dto.setUpdatedAt(session.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
