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

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class RagLLMClient {
    private static final Logger logger = LoggerFactory.getLogger(RagLLMClient.class);

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final boolean enabled;

    public RagLLMClient(
            RestTemplateBuilder restTemplateBuilder,
            @Value("${rag.llm.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${rag.llm.api-key:}") String apiKey,
            @Value("${rag.llm.model:gpt-4o}") String model,
            @Value("${rag.llm.timeout-ms:120000}") int timeoutMs,
            @Value("${rag.llm.enabled:true}") boolean enabled
    ) {
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(timeoutMs))
                .setReadTimeout(Duration.ofMillis(timeoutMs))
                .build();
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.enabled = enabled;
    }

    /**
     * Analyze an image using multimodal LLM and return a Chinese description.
     */
    public String analyzeImage(String imagePath) {
        if (!enabled) {
            logger.debug("RAG LLM is disabled, skip image analysis");
            return null;
        }

        File file = new File(imagePath);
        if (!file.exists()) {
            logger.warn("Image file not found: {}", imagePath);
            return null;
        }

        long t0 = System.currentTimeMillis();
        try {
            byte[] imageBytes = Files.readAllBytes(file.toPath());
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            String mimeType = determineMimeType(file);
            String dataUrl = "data:" + mimeType + ";base64," + base64Image;

            String url = baseUrl + "/chat/completions";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            String prompt = "请详细描述这张图片的内容。包括：\n" +
                    "1. 场景和环境（室内/室外、地点类型等）\n" +
                    "2. 主要人物、物体和活动\n" +
                    "3. 图片中的文字内容（如果有）\n" +
                    "4. 整体氛围和情感\n" +
                    "请用中文回答，控制在200字以内。";

            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of(
                    "role", "user",
                    "content", List.of(
                            Map.of("type", "text", "text", prompt),
                            Map.of("type", "image_url", "image_url", Map.of("url", dataUrl))
                    )
            ));

            Map<String, Object> body = new java.util.HashMap<>();
            body.put("model", model);
            body.put("messages", messages);
            body.put("max_tokens", 1024);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            long llmMs = System.currentTimeMillis() - t0;

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("[RAG LLM] analyzeImage failed: status={}, path={}, time={}ms",
                        response.getStatusCode().value(), imagePath, llmMs);
                return null;
            }

            String description = extractContent(response.getBody());
            logger.info("[RAG LLM] analyzeImage success: path={}, time={}ms, descLength={}",
                    imagePath, llmMs, description != null ? description.length() : 0);
            return description;
        } catch (IOException e) {
            logger.error("[RAG LLM] analyzeImage IOException: path={}, msg={}", imagePath, e.getMessage());
            return null;
        } catch (RestClientException e) {
            long llmMs = System.currentTimeMillis() - t0;
            logger.error("[RAG LLM] analyzeImage RestClientException: path={}, time={}ms, msg={}",
                    imagePath, llmMs, e.getMessage());
            return null;
        }
    }

    /**
     * Generate an answer based on user query and retrieved image descriptions.
     */
    public String generateAnswer(String query, List<Map<String, Object>> references) {
        if (!enabled) {
            logger.debug("RAG LLM is disabled, skip answer generation");
            return "AI 服务当前不可用，请稍后重试。";
        }

        long t0 = System.currentTimeMillis();
        try {
            String url = baseUrl + "/chat/completions";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            StringBuilder context = new StringBuilder();
            context.append("以下是用户相册中相关的照片描述：\n\n");
            for (int i = 0; i < references.size(); i++) {
                Map<String, Object> ref = references.get(i);
                String imageId = String.valueOf(ref.getOrDefault("image_id", ""));
                String desc = String.valueOf(ref.getOrDefault("description", ""));
                context.append("【照片").append(i + 1).append("】ID: ").append(imageId)
                        .append("\n描述: ").append(desc).append("\n\n");
            }

            String systemPrompt = "你是一个智能相册助手，擅长根据用户的照片内容回答问题。请根据提供的照片描述回答用户问题，如果相关照片有帮助，请在回答中提及。回答要简洁、准确、友好。";
            String userPrompt = "用户问题：" + query + "\n\n" + context;

            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPrompt));
            messages.add(Map.of("role", "user", "content", userPrompt));

            Map<String, Object> body = new java.util.HashMap<>();
            body.put("model", model);
            body.put("messages", messages);
            body.put("max_tokens", 2048);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            long llmMs = System.currentTimeMillis() - t0;

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("[RAG LLM] generateAnswer failed: status={}, time={}ms",
                        response.getStatusCode().value(), llmMs);
                return "抱歉，AI 回答生成失败，请稍后重试。";
            }

            String answer = extractContent(response.getBody());
            logger.info("[RAG LLM] generateAnswer success: time={}ms, answerLength={}", llmMs,
                    answer != null ? answer.length() : 0);
            return answer != null ? answer : "抱歉，未能生成有效回答。";
        } catch (RestClientException e) {
            long llmMs = System.currentTimeMillis() - t0;
            logger.error("[RAG LLM] generateAnswer RestClientException: time={}ms, msg={}", llmMs, e.getMessage());
            return "抱歉，AI 服务暂时不可用，请稍后重试。";
        }
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> body) {
        if (body == null) return null;
        Object choicesObj = body.get("choices");
        if (!(choicesObj instanceof List)) return null;
        List<Map<String, Object>> choices = (List<Map<String, Object>>) choicesObj;
        if (choices.isEmpty()) return null;
        Map<String, Object> first = choices.get(0);
        if (first == null) return null;
        Map<String, Object> message = (Map<String, Object>) first.get("message");
        if (message == null) return null;
        Object content = message.get("content");
        return content != null ? content.toString() : null;
    }

    private String determineMimeType(File file) {
        String name = file.getName().toLowerCase();
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".gif")) return "image/gif";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".bmp")) return "image/bmp";
        return "image/jpeg";
    }
}
