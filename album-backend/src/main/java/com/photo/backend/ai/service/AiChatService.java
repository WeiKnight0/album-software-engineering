package com.photo.backend.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.photo.backend.ai.dto.AiChatMessageDTO;
import com.photo.backend.ai.dto.AiChatSessionDTO;
import com.photo.backend.ai.entity.AiChatMessage;
import com.photo.backend.ai.entity.AiChatSession;
import com.photo.backend.ai.repository.AiChatMessageRepository;
import com.photo.backend.ai.repository.AiChatSessionRepository;
import com.photo.backend.rag.dto.ChatRequest;
import com.photo.backend.rag.dto.ChatResponse;
import com.photo.backend.rag.service.RagService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class AiChatService {
    private static final int MAX_CONTEXT_MESSAGES = 10;
    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final RagService ragService;
    private final ObjectMapper objectMapper;

    public AiChatService(
            AiChatSessionRepository sessionRepository,
            AiChatMessageRepository messageRepository,
            RagService ragService,
            ObjectMapper objectMapper
    ) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.ragService = ragService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<AiChatSessionDTO> listSessions(Integer userId) {
        return sessionRepository.findByUserIdAndDeletedFalseOrderByUpdatedAtDesc(userId).stream()
                .map(AiChatSessionDTO::from)
                .toList();
    }

    @Transactional
    public AiChatSessionDTO createSession(Integer userId) {
        AiChatSession session = new AiChatSession();
        session.setUserId(userId);
        session.setTitle("新的对话");
        return AiChatSessionDTO.from(sessionRepository.save(session));
    }

    @Transactional
    public AiChatSessionDTO updateSessionTitle(Integer userId, Long sessionId, String title) {
        AiChatSession session = getSession(userId, sessionId);
        String nextTitle = title == null ? "新的对话" : title.trim();
        if (nextTitle.isBlank()) nextTitle = "新的对话";
        if (nextTitle.length() > 100) nextTitle = nextTitle.substring(0, 100);
        session.setTitle(nextTitle);
        return AiChatSessionDTO.from(sessionRepository.save(session));
    }

    @Transactional
    public void deleteSession(Integer userId, Long sessionId) {
        AiChatSession session = getSession(userId, sessionId);
        session.setDeleted(true);
        sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public List<AiChatMessageDTO> listMessages(Integer userId, Long sessionId) {
        getSession(userId, sessionId);
        return messageRepository.findBySessionIdAndUserIdOrderByCreatedAtAsc(sessionId, userId).stream()
                .map(AiChatMessageDTO::from)
                .toList();
    }

    @Transactional
    public List<AiChatMessageDTO> chat(Integer userId, Long sessionId, String message) {
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("message is required");
        }
        AiChatSession session = getSession(userId, sessionId);
        String content = message.trim();
        if (content.length() > 4000) content = content.substring(0, 4000);

        AiChatMessage userMessage = saveMessage(userId, sessionId, "user", content, null);
        if (isDefaultTitle(session.getTitle())) {
            session.setTitle(content.length() > 20 ? content.substring(0, 20) : content);
        }

        List<ChatRequest.HistoryMessage> history = buildHistory(userId, sessionId);
        ChatResponse response = ragService.chat(userId, content, history);
        AiChatMessage assistantMessage = saveMessage(userId, sessionId, "assistant", response.getAnswer(), toJson(response.getReferences()));
        sessionRepository.save(session);

        return List.of(AiChatMessageDTO.from(userMessage), AiChatMessageDTO.from(assistantMessage));
    }

    private AiChatSession getSession(Integer userId, Long sessionId) {
        return sessionRepository.findByIdAndUserIdAndDeletedFalse(sessionId, userId)
                .orElseThrow(() -> new IllegalArgumentException("会话不存在"));
    }

    private AiChatMessage saveMessage(Integer userId, Long sessionId, String role, String content, String referencesJson) {
        AiChatMessage message = new AiChatMessage();
        message.setUserId(userId);
        message.setSessionId(sessionId);
        message.setRole(role);
        message.setContent(content == null ? "" : content);
        message.setReferencesJson(referencesJson);
        return messageRepository.save(message);
    }

    private List<ChatRequest.HistoryMessage> buildHistory(Integer userId, Long sessionId) {
        List<AiChatMessage> messages = messageRepository.findBySessionIdAndUserIdOrderByCreatedAtDesc(
                sessionId,
                userId,
                PageRequest.of(0, MAX_CONTEXT_MESSAGES + 1)
        );
        Collections.reverse(messages);
        List<ChatRequest.HistoryMessage> history = new ArrayList<>();
        for (AiChatMessage message : messages) {
            if (history.size() >= MAX_CONTEXT_MESSAGES) break;
            if (!"user".equals(message.getRole()) && !"assistant".equals(message.getRole())) continue;
            ChatRequest.HistoryMessage item = new ChatRequest.HistoryMessage();
            item.setRole(message.getRole());
            item.setContent(message.getContent());
            history.add(item);
        }
        return history;
    }

    private String toJson(List<ChatResponse.ChatReference> references) {
        if (references == null || references.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(references);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isDefaultTitle(String title) {
        return title == null || title.isBlank() || "新的对话".equals(title) || "默认对话".equals(title);
    }
}
