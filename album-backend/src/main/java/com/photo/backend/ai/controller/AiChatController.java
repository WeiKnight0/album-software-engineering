package com.photo.backend.ai.controller;

import com.photo.backend.ai.dto.AiChatMessageDTO;
import com.photo.backend.ai.dto.AiChatRequest;
import com.photo.backend.ai.dto.AiChatSessionDTO;
import com.photo.backend.ai.service.AiChatService;
import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.user.service.CurrentUserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiChatController {
    private final AiChatService aiChatService;
    private final CurrentUserService currentUserService;

    public AiChatController(AiChatService aiChatService, CurrentUserService currentUserService) {
        this.aiChatService = aiChatService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<AiChatSessionDTO>>> listSessions() {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.listSessions(currentUserService.getCurrentUserId())));
    }

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<AiChatSessionDTO>> createSession() {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.createSession(currentUserService.getCurrentUserId()), "会话创建成功"));
    }

    @PatchMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<AiChatSessionDTO>> updateSessionTitle(
            @PathVariable Long sessionId,
            @RequestBody Map<String, String> payload
    ) {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.updateSessionTitle(currentUserService.getCurrentUserId(), sessionId, payload.get("title")), "会话更新成功"));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(@PathVariable Long sessionId) {
        aiChatService.deleteSession(currentUserService.getCurrentUserId(), sessionId);
        return ResponseEntity.ok(ApiResponse.success("会话删除成功"));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<AiChatMessageDTO>>> listMessages(@PathVariable Long sessionId) {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.listMessages(currentUserService.getCurrentUserId(), sessionId)));
    }

    @PostMapping("/sessions/{sessionId}/chat")
    public ResponseEntity<ApiResponse<List<AiChatMessageDTO>>> chat(
            @PathVariable Long sessionId,
            @RequestBody AiChatRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(aiChatService.chat(currentUserService.getCurrentUserId(), sessionId, request.getMessage()), "Chat response generated"));
    }
}
