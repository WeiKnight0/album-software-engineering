package com.photo.backend.ai.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.photo.backend.ai.entity.AiChatMessage;
import com.photo.backend.rag.dto.ChatResponse;

import java.time.LocalDateTime;
import java.util.List;

public class AiChatMessageDTO {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private Long id;
    private String role;
    private String content;
    private List<ChatResponse.ChatReference> references;
    private LocalDateTime createdAt;

    public static AiChatMessageDTO from(AiChatMessage message) {
        AiChatMessageDTO dto = new AiChatMessageDTO();
        dto.setId(message.getId());
        dto.setRole(message.getRole());
        dto.setContent(message.getContent());
        dto.setCreatedAt(message.getCreatedAt());
        dto.setReferences(parseReferences(message.getReferencesJson()));
        return dto;
    }

    private static List<ChatResponse.ChatReference> parseReferences(String value) {
        if (value == null || value.isBlank()) return List.of();
        try {
            return OBJECT_MAPPER.readValue(value, new TypeReference<List<ChatResponse.ChatReference>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public List<ChatResponse.ChatReference> getReferences() { return references; }
    public void setReferences(List<ChatResponse.ChatReference> references) { this.references = references; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
