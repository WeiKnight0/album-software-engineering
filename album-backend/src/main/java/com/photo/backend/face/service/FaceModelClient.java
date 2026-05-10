package com.photo.backend.face.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;

@Service
/**
 * 人脸模型调用客户端。
 *
 * <p>负责把本地图片整理成 multipart/form-data 请求，发送给外部人脸模型服务，
 * 然后把返回结果原样交给上层业务处理。</p>
 */
public class FaceModelClient {
    private static final Logger logger = LoggerFactory.getLogger(FaceModelClient.class);

    private final RestTemplate restTemplate;
    private final String inferUrl;
    private final boolean enabled;
    private final String serviceToken;

    public FaceModelClient(
        RestTemplateBuilder restTemplateBuilder,
        @Value("${face.model.base-url:http://127.0.0.1:8001}") String baseUrl,
        @Value("${face.model.infer-path:/api/v1/infer}") String inferPath,
        @Value("${face.model.timeout-ms:120000}") int timeoutMs,
        @Value("${face.model.enabled:true}") boolean enabled,
        @Value("${face.model.service-token:${internal.service-token:}}") String serviceToken
    ) {
        this.restTemplate = restTemplateBuilder
            .setConnectTimeout(Duration.ofMillis(timeoutMs))
            .setReadTimeout(Duration.ofMillis(timeoutMs))
            .build();
        this.inferUrl = normalizeUrl(baseUrl, inferPath);
        this.enabled = enabled;
        this.serviceToken = serviceToken;
    }

    /**
     * 发起人脸识别请求。
     *
     * <p>这里不做业务判定，只负责把图片和必要上下文发送给模型服务。</p>
     */
    public Map<String, Object> infer(
        Integer userId,
        String imageId,
        byte[] payload
    ) {
        if (!enabled) {
            // 当模型能力关闭时，直接返回空结果，方便上层继续走降级逻辑。
            logger.debug("Face model integration is disabled, skip request");
            return Collections.emptyMap();
        }

        if (payload == null || payload.length == 0) {
            throw new FaceServiceException("face model request failed: payload is empty");
        }

        String safeFilename = (imageId == null || imageId.isBlank()) ? "upload.jpg" : imageId + ".jpg";

        try {
            // 组装 multipart 请求头，模拟普通文件上传。
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            if (serviceToken != null && !serviceToken.isBlank()) {
                headers.setBearerAuth(serviceToken);
            }

            // 请求体里放图片文件本身。
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", new ByteArrayResource(payload) {
                @Override
                public String getFilename() {
                    return safeFilename;
                }
            });

            // 额外参数用于模型侧做追踪或日志关联。
            if (userId != null) {
                body.add("user_id", userId.toString());
            }
            if (imageId != null && !imageId.isBlank()) {
                body.add("image_id", imageId);
            }

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(inferUrl, requestEntity, Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new FaceServiceException("face model request failed: status=" + response.getStatusCode().value());
            }

            // 模型返回的是 Map 结构，直接交给上层解析。
            Map<String, Object> result = response.getBody();
            return result != null ? result : Collections.emptyMap();
        } catch (RestClientException e) {
            throw new FaceServiceException("face model request failed: " + e.getMessage(), e);
        }
    }

    /**
     * 拼出最终请求地址，避免 baseUrl 和 inferPath 的斜杠拼接出错。
     */
    private String normalizeUrl(String baseUrl, String inferPath) {
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedPath = inferPath.startsWith("/") ? inferPath : "/" + inferPath;
        return normalizedBase + normalizedPath;
    }
}
