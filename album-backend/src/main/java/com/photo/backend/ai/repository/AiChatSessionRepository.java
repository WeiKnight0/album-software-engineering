package com.photo.backend.ai.repository;

import com.photo.backend.ai.entity.AiChatSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AiChatSessionRepository extends JpaRepository<AiChatSession, Long> {
    List<AiChatSession> findByUserIdAndDeletedFalseOrderByUpdatedAtDesc(Integer userId);
    Optional<AiChatSession> findByIdAndUserIdAndDeletedFalse(Long id, Integer userId);
}
