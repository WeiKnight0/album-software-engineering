package com.photo.backend.rag.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.Image;
import com.photo.backend.rag.dto.ChatRequest;
import com.photo.backend.rag.dto.ChatResponse;
import com.photo.backend.rag.dto.SearchRequest;
import com.photo.backend.rag.service.RagService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rag")
public class RagController {
    private static final Logger logger = LoggerFactory.getLogger(RagController.class);

    @Autowired
    private RagService ragService;

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<List<Image>>> searchImages(@RequestBody SearchRequest request) {
        try {
            if (request.getUserId() == null || request.getQuery() == null || request.getQuery().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("userId and query are required", "INVALID_PARAMS"));
            }

            List<Image> results = ragService.search(request.getUserId(), request.getQuery(), request.getTopK());
            if (results.isEmpty()) {
                return ResponseEntity.ok(ApiResponse.success(results, "No matching images found"));
            }
            return ResponseEntity.ok(ApiResponse.success(results, "Search completed"));
        } catch (Exception e) {
            logger.error("RAG search failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Search failed: " + e.getMessage(), "SEARCH_FAILED"));
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(@RequestBody ChatRequest request) {
        try {
            if (request.getUserId() == null || request.getMessage() == null || request.getMessage().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("userId and message are required", "INVALID_PARAMS"));
            }

            ChatResponse response = ragService.chat(request.getUserId(), request.getMessage());
            return ResponseEntity.ok(ApiResponse.success(response, "Chat response generated"));
        } catch (Exception e) {
            logger.error("RAG chat failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Chat failed: " + e.getMessage(), "CHAT_FAILED"));
        }
    }
}
