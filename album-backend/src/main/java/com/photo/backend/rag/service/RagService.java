package com.photo.backend.rag.service;

import com.photo.backend.common.entity.Image;
import com.photo.backend.common.entity.ImageAnalysis;
import com.photo.backend.common.repository.ImageAnalysisRepository;
import com.photo.backend.asset.service.ImageService;
import com.photo.backend.rag.dto.ChatRequest;
import com.photo.backend.rag.dto.ChatResponse;
import com.photo.backend.rag.entity.RagPerformanceLog;
import com.photo.backend.rag.repository.RagPerformanceLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RagService {
    private static final Logger logger = LoggerFactory.getLogger(RagService.class);

    @Autowired
    private RagVectorClient ragVectorClient;

    @Autowired
    private RagLLMClient ragLLMClient;

    @Autowired
    @Lazy
    private ImageService imageService;

    @Autowired
    private ImageAnalysisRepository imageAnalysisRepository;

    @Autowired
    private RagPerformanceLogRepository performanceLogRepository;

    @Value("${rag.top-k:10}")
    private int defaultTopK;

    @Value("${rag.search.score-threshold:0.6}")
    private double searchScoreThreshold;

    @Value("${rag.chat.max-references:20}")
    private int chatMaxReferences;

    /**
     * Analyze image with LLM and index the description into vector store.
     */
    public boolean analyzeAndIndexImage(Integer userId, String imageId, String imagePath) {
        long totalT0 = System.currentTimeMillis();
        Long llmTime = null;
        Long vectorTime = null;
        String errorMsg = null;

        try {
            // Step 1: LLM analyze image
            long t1 = System.currentTimeMillis();
            String description = ragLLMClient.analyzeImage(imagePath);
            llmTime = System.currentTimeMillis() - t1;

            if (description == null || description.isBlank()) {
                logger.warn("[RAG] Image analysis returned empty description for imageId={}", imageId);
                errorMsg = "LLM analysis returned empty description";
                savePerfLog("INDEX", (long) userId, imageId, null, llmTime, null,
                        System.currentTimeMillis() - totalT0, 0, errorMsg);
                return false;
            }

            // Step 2: Index into vector store
            long t2 = System.currentTimeMillis();
            boolean success = ragVectorClient.index(userId, imageId, description);
            vectorTime = System.currentTimeMillis() - t2;
            long totalTime = System.currentTimeMillis() - totalT0;

            if (success) {
                savePerfLog("INDEX", (long) userId, imageId, vectorTime, llmTime, null,
                        totalTime, 1, null);
                logger.info("[RAG] analyzeAndIndexImage success: userId={}, imageId={}, totalTime={}ms, llmTime={}ms, vectorTime={}ms",
                        userId, imageId, totalTime, llmTime, vectorTime);
            } else {
                errorMsg = "Vector index failed";
                savePerfLog("INDEX", (long) userId, imageId, vectorTime, llmTime, null,
                        totalTime, 0, errorMsg);
                logger.warn("[RAG] analyzeAndIndexImage vector index failed: userId={}, imageId={}", userId, imageId);
            }
            return success;
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - totalT0;
            errorMsg = e.getMessage();
            savePerfLog("INDEX", (long) userId, imageId, null, llmTime, null,
                    totalTime, 0, errorMsg);
            logger.error("[RAG] analyzeAndIndexImage exception: userId={}, imageId={}, totalTime={}ms",
                    userId, imageId, totalTime, e);
            return false;
        }
    }

    /**
     * Smart search: vector retrieval + hydrate from DB.
     */
    public List<Image> search(Integer userId, String query, Integer topK) {
        long totalT0 = System.currentTimeMillis();
        Long vectorTime = null;
        Long dbTime = null;

        try {
            if (topK == null) topK = defaultTopK;

            // Step 1: Vector search
            long t1 = System.currentTimeMillis();
            List<Map<String, Object>> hits = ragVectorClient.search(userId, query.trim(), topK);
            vectorTime = System.currentTimeMillis() - t1;

            if (hits == null || hits.isEmpty()) {
                long totalTime = System.currentTimeMillis() - totalT0;
                savePerfLog("SEARCH", (long) userId, null, vectorTime, null, null,
                        totalTime, 0, null);
                return Collections.emptyList();
            }

            // Filter by similarity score threshold
            List<Map<String, Object>> filteredHits = hits.stream()
                    .filter(hit -> {
                        Object scoreObj = hit.get("score");
                        double score = 0.0;
                        if (scoreObj instanceof Number) {
                            score = ((Number) scoreObj).doubleValue();
                        }
                        return score >= searchScoreThreshold;
                    })
                    .collect(Collectors.toList());

            logger.info("[RAG] search filtered by score: rawHits={}, filteredHits={}, threshold={}",
                    hits.size(), filteredHits.size(), searchScoreThreshold);

            if (filteredHits.isEmpty()) {
                long totalTime = System.currentTimeMillis() - totalT0;
                savePerfLog("SEARCH", (long) userId, null, vectorTime, null, null,
                        totalTime, 0, null);
                return Collections.emptyList();
            }

            // Step 2: Hydrate from SQLite
            long t2 = System.currentTimeMillis();
            List<String> imageIds = filteredHits.stream()
                    .map(hit -> {
                        Object id = hit.get("image_id");
                        return id != null ? id.toString() : null;
                    })
                    .filter(id -> id != null && !id.isBlank())
                    .collect(Collectors.toList());

            List<Image> results = new ArrayList<>();
            for (String imageId : imageIds) {
                try {
                    Image image = imageService.getImageById(imageId, userId);
                    if (image != null && !Boolean.TRUE.equals(image.getIsInRecycleBin())) {
                        results.add(image);
                    }
                } catch (Exception e) {
                    logger.warn("[RAG] Image not found during search hydration: imageId={}, userId={}", imageId, userId);
                }
            }
            dbTime = System.currentTimeMillis() - t2;
            long totalTime = System.currentTimeMillis() - totalT0;

            savePerfLog("SEARCH", (long) userId, null, vectorTime, null, dbTime,
                    totalTime, results.size(), null);
            logger.info("[RAG] search success: userId={}, query='{}', results={}, totalTime={}ms, vectorTime={}ms, dbTime={}ms",
                    userId, query, results.size(), totalTime, vectorTime, dbTime);
            return results;
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - totalT0;
            savePerfLog("SEARCH", (long) userId, null, vectorTime, null, dbTime,
                    totalTime, 0, e.getMessage());
            logger.error("[RAG] search exception: userId={}, query={}, totalTime={}ms", userId, query, totalTime, e);
            return Collections.emptyList();
        }
    }

    /**
     * RAG Chat: retrieve relevant images, then generate answer with LLM.
     */
    public ChatResponse chat(Integer userId, String message) {
        return chat(userId, message, Collections.emptyList());
    }

    public ChatResponse chat(Integer userId, String message, List<ChatRequest.HistoryMessage> history) {
        long totalT0 = System.currentTimeMillis();
        Long vectorTime = null;
        Long llmTime = null;

        try {
            // Step 1: Retrieve relevant images with higher topK for filtering
            long t1 = System.currentTimeMillis();
            List<Map<String, Object>> hits = ragVectorClient.search(userId, message.trim(), chatMaxReferences);
            vectorTime = System.currentTimeMillis() - t1;

            // Filter by score threshold and limit to max-references
            List<Map<String, Object>> filteredHits = new ArrayList<>();
            if (hits != null) {
                for (Map<String, Object> hit : hits) {
                    Object scoreObj = hit.get("score");
                    double score = 0.0;
                    if (scoreObj instanceof Number) {
                        score = ((Number) scoreObj).doubleValue();
                    }
                    if (score >= searchScoreThreshold) {
                        filteredHits.add(hit);
                    }
                    if (filteredHits.size() >= chatMaxReferences) {
                        break;
                    }
                }
            }

            logger.info("[RAG] chat retrieved: rawHits={}, filteredHits={}, threshold={}, maxRefs={}",
                    hits != null ? hits.size() : 0, filteredHits.size(), searchScoreThreshold, chatMaxReferences);

            // Step 2: Generate answer with LLM
            long t2 = System.currentTimeMillis();
            String answer = ragLLMClient.generateAnswer(message, filteredHits, sanitizeHistory(history));
            llmTime = System.currentTimeMillis() - t2;

            // Build references from hydrated images only, so stale vector hits do not produce broken URLs.
            List<ChatResponse.ChatReference> references = new ArrayList<>();
            for (Map<String, Object> hit : filteredHits) {
                String imageId = String.valueOf(hit.getOrDefault("image_id", ""));
                if (!imageId.isBlank()) {
                    try {
                        Image img = imageService.getImageById(imageId, userId);
                        if (img != null && !Boolean.TRUE.equals(img.getIsInRecycleBin())) {
                            String desc = img.getOriginalFilename() != null ? img.getOriginalFilename() : "相关照片";
                            references.add(new ChatResponse.ChatReference(imageId, desc, ""));
                        }
                    } catch (Exception ex) {
                        logger.debug("[RAG] chat: skip stale image reference imageId={}, userId={}", imageId, userId);
                    }
                }
            }

            long totalTime = System.currentTimeMillis() - totalT0;
            savePerfLog("CHAT", (long) userId, null, vectorTime, llmTime, null,
                    totalTime, references.size(), null);
            logger.info("[RAG] chat success: userId={}, totalTime={}ms, vectorTime={}ms, llmTime={}ms, refs={}",
                    userId, totalTime, vectorTime, llmTime, references.size());

            return new ChatResponse(answer, references);
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - totalT0;
            savePerfLog("CHAT", (long) userId, null, vectorTime, llmTime, null,
                    totalTime, 0, e.getMessage());
            logger.error("[RAG] chat exception: userId={}, totalTime={}ms", userId, totalTime, e);
            return new ChatResponse("抱歉，服务暂时异常，请稍后重试。", Collections.emptyList());
        }
    }

    private List<ChatRequest.HistoryMessage> sanitizeHistory(List<ChatRequest.HistoryMessage> history) {
        if (history == null || history.isEmpty()) {
            return Collections.emptyList();
        }
        return history.stream()
                .filter(item -> item != null && item.getContent() != null && !item.getContent().isBlank())
                .filter(item -> "user".equals(item.getRole()) || "assistant".equals(item.getRole()))
                .skip(Math.max(0, history.size() - 10))
                .map(item -> {
                    ChatRequest.HistoryMessage next = new ChatRequest.HistoryMessage();
                    next.setRole(item.getRole());
                    String content = item.getContent().trim();
                    next.setContent(content.length() > 2000 ? content.substring(0, 2000) : content);
                    return next;
                })
                .collect(Collectors.toList());
    }

    public boolean deleteVector(Integer userId, String imageId) {
        return ragVectorClient.deleteVector(userId, imageId);
    }

    private void savePerfLog(String operationType, Long userId, String imageId,
                             Long vectorTime, Long llmTime, Long dbTime,
                             Long totalTime, Integer resultCount, String errorMsg) {
        try {
            RagPerformanceLog log = new RagPerformanceLog();
            log.setOperationType(operationType);
            log.setUserId(userId);
            log.setImageId(imageId);
            log.setVectorSearchTimeMs(vectorTime);
            log.setLlmTimeMs(llmTime);
            log.setDbTimeMs(dbTime);
            log.setTotalTimeMs(totalTime);
            log.setResultCount(resultCount);
            log.setErrorMessage(errorMsg);
            performanceLogRepository.save(log);
        } catch (Exception e) {
            logger.warn("[RAG] Failed to save performance log: {}", e.getMessage());
        }
    }
}
