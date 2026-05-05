package com.photo.backend.rag.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class RagVectorClient {
    private static final Logger logger = LoggerFactory.getLogger(RagVectorClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final boolean enabled;

    public RagVectorClient(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${rag.base-url:http://127.0.0.1:8003}") String baseUrl,
            @Value("${rag.timeout-ms:60000}") int timeoutMs,
            @Value("${rag.enabled:true}") boolean enabled
    ) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(timeoutMs))
                .setReadTimeout(Duration.ofMillis(timeoutMs))
                .build();
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.enabled = enabled;
    }

    public boolean index(Integer userId, String imageId, String description) {
        if (!enabled) {
            logger.debug("RAG vector integration is disabled, skip index");
            return false;
        }
        if (userId == null || imageId == null || imageId.isBlank() || description == null || description.isBlank()) {
            logger.warn("RAG index skipped: invalid params userId={}, imageId={}", userId, imageId);
            return false;
        }

        long t0 = System.currentTimeMillis();
        try {
            String url = baseUrl + "/index";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                    "user_id", userId,
                    "image_id", imageId,
                    "description", description
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            logger.info("[RAG Vector] HTTP POST {} for userId={}, imageId={}", url, userId, imageId);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            long httpMs = System.currentTimeMillis() - t0;

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("[RAG Vector] index failed: status={}, userId={}, imageId={}, httpTime={}ms",
                        response.getStatusCode().value(), userId, imageId, httpMs);
                return false;
            }

            Map<String, Object> result = response.getBody();
            boolean success = result != null && Boolean.TRUE.equals(result.get("success"));
            if (success) {
                logger.info("[RAG Vector] index success: userId={}, imageId={}, httpTime={}ms", userId, imageId, httpMs);
            } else {
                logger.warn("[RAG Vector] index returned failure: userId={}, imageId={}, httpTime={}ms", userId, imageId, httpMs);
            }
            return success;
        } catch (RestClientException e) {
            long httpMs = System.currentTimeMillis() - t0;
            logger.error("[RAG Vector] index RestClientException: userId={}, imageId={}, httpTime={}ms, msg={}",
                    userId, imageId, httpMs, e.getMessage(), e);
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> search(Integer userId, String query, Integer topK) {
        if (!enabled) {
            logger.debug("RAG vector integration is disabled, skip search");
            return Collections.emptyList();
        }
        if (userId == null || query == null || query.isBlank()) {
            return Collections.emptyList();
        }

        long t0 = System.currentTimeMillis();
        try {
            String url = baseUrl + "/search";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = new java.util.HashMap<>();
            body.put("user_id", userId);
            body.put("query", query);
            if (topK != null) {
                body.put("top_k", topK);
            }

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            long httpMs = System.currentTimeMillis() - t0;

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("[RAG Vector] search failed: status={}, userId={}, httpTime={}ms",
                        response.getStatusCode().value(), userId, httpMs);
                return Collections.emptyList();
            }

            Map<String, Object> result = response.getBody();
            if (result == null || result.get("results") == null) {
                return Collections.emptyList();
            }

            List<Map<String, Object>> results = (List<Map<String, Object>>) result.get("results");
            logger.info("[RAG Vector] search success: userId={}, query='{}', hits={}, httpTime={}ms",
                    userId, query, results.size(), httpMs);
            return results;
        } catch (RestClientException e) {
            logger.error("[RAG Vector] search error: userId={}, query={}, msg={}", userId, query, e.getMessage());
            return Collections.emptyList();
        }
    }

    public boolean deleteVector(Integer userId, String imageId) {
        if (!enabled) {
            logger.debug("RAG vector integration is disabled, skip delete");
            return false;
        }
        if (userId == null || imageId == null || imageId.isBlank()) {
            return false;
        }

        try {
            String url = baseUrl + "/index/" + userId + "/" + imageId;
            restTemplate.delete(url);
            logger.info("[RAG Vector] delete success: userId={}, imageId={}", userId, imageId);
            return true;
        } catch (RestClientException e) {
            logger.error("[RAG Vector] delete error: userId={}, imageId={}, msg={}", userId, imageId, e.getMessage());
            return false;
        }
    }
}
