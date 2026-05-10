package com.photo.backend.ai.repository;

import com.photo.backend.ai.entity.AiChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, Long> {
    List<AiChatMessage> findBySessionIdAndUserIdOrderByCreatedAtAsc(Long sessionId, Integer userId);
    List<AiChatMessage> findBySessionIdAndUserIdOrderByCreatedAtDesc(Long sessionId, Integer userId, Pageable pageable);
}
