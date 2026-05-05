package com.photo.backend.face.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.photo.backend.common.entity.Face;
import com.photo.backend.common.entity.FaceAppearance;
import com.photo.backend.common.repository.FaceAppearanceRepository;
import com.photo.backend.common.repository.FaceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class FaceRecognitionPersistenceService {
    private static final Logger logger = LoggerFactory.getLogger(FaceRecognitionPersistenceService.class);

    private final FaceRepository faceRepository;
    private final FaceAppearanceRepository faceAppearanceRepository;
    private final ObjectMapper objectMapper;
    private final String coversDir;
    private final double matchThreshold;

    public FaceRecognitionPersistenceService(
        FaceRepository faceRepository,
        FaceAppearanceRepository faceAppearanceRepository,
        ObjectMapper objectMapper,
        @Value("${face.model.covers-dir:covers}") String coversDir,
        @Value("${face.model.match-threshold:0.5}") double matchThreshold
    ) {
        this.faceRepository = faceRepository;
        this.faceAppearanceRepository = faceAppearanceRepository;
        this.objectMapper = objectMapper;
        this.coversDir = coversDir;
        this.matchThreshold = matchThreshold;
    }

    public int persistInferResult(
        Integer userId,
        String imageId,
        byte[] payload,
        Map<String, Object> inferResult
    ) {
        List<Map<String, Object>> results = extractInferResults(inferResult);

        List<FaceAppearance> existingAppearances = faceAppearanceRepository.findByImageId(imageId);
        if (!existingAppearances.isEmpty()) {
            Set<Integer> existingFaceIds = existingAppearances.stream()
                .map(FaceAppearance::getFaceId)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
            faceAppearanceRepository.deleteAll(existingAppearances);
            cleanupFacesWithoutAppearances(existingFaceIds);
        }

        if (results.isEmpty()) {
            return 0;
        }

        List<Face> userFaces = faceRepository.findByUserId(userId);
        List<ParsedFaceEmbedding> parsedFaces = toParsedFaceEmbeddings(userFaces);
        List<FaceAppearance> appearances = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Map<String, Object> result : results) {
            List<Double> embedding = asDoubleList(result.get("embedding"));
            if (embedding == null || embedding.isEmpty()) {
                continue;
            }

            Map<String, Object> bbox = asObjectMap(result.get("bbox"));
            MatchResult match = findBestMatch(embedding, parsedFaces);

            Integer faceId;
            Double distance;
            if (match.face() == null || match.distance() >= matchThreshold) {
                Face createdFace = new Face();
                createdFace.setUserId(userId);
                createdFace.setEmbedding(toJsonString(embedding));
                createdFace.setCreatedAt(now);
                createdFace.setLastSeenAt(now);

                Face saved = faceRepository.save(createdFace);
                String coverPath = saveFaceCover(userId, bbox, payload);
                if (!coverPath.isBlank()) {
                    saved.setCoverPath(coverPath);
                    saved = faceRepository.save(saved);
                }
                parsedFaces.add(new ParsedFaceEmbedding(saved.getId(), embedding));
                faceId = saved.getId();
                distance = null;
            } else {
                Face matchedFace = match.face();
                matchedFace.setLastSeenAt(now);
                faceRepository.save(matchedFace);
                faceId = matchedFace.getId();
                distance = match.distance();
            }

            FaceAppearance appearance = new FaceAppearance();
            appearance.setImageId(imageId);
            appearance.setFaceId(faceId);
            appearance.setBbox(toJsonString(bbox));
            appearance.setDistance(distance);
            appearance.setCreatedAt(now);
            appearances.add(appearance);
        }

        if (!appearances.isEmpty()) {
            faceAppearanceRepository.saveAll(appearances);
        }

        return appearances.size();
    }

    private List<Map<String, Object>> extractInferResults(Map<String, Object> inferResult) {
        if (inferResult == null) {
            return Collections.emptyList();
        }

        Object rawResults = inferResult.get("results");
        if (!(rawResults instanceof List<?> rawList)) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (Object item : rawList) {
            if (item instanceof Map<?, ?> mapItem) {
                results.add(objectMapper.convertValue(mapItem, new TypeReference<>() {}));
            }
        }
        return results;
    }

    private List<ParsedFaceEmbedding> toParsedFaceEmbeddings(List<Face> faces) {
        List<ParsedFaceEmbedding> parsed = new ArrayList<>();
        for (Face face : faces) {
            try {
                List<Double> embedding = objectMapper.readValue(face.getEmbedding(), new TypeReference<>() {});
                if (embedding != null && !embedding.isEmpty()) {
                    parsed.add(new ParsedFaceEmbedding(face.getId(), embedding));
                }
            } catch (JsonProcessingException e) {
                logger.warn("Skip invalid embedding for faceId={}", face.getId());
            }
        }
        return parsed;
    }

    private MatchResult findBestMatch(List<Double> currentEmbedding, List<ParsedFaceEmbedding> existingFaces) {
        Face matchedFace = null;
        double minDistance = Double.MAX_VALUE;

        for (ParsedFaceEmbedding existing : existingFaces) {
            double distance = cosineDistance(currentEmbedding, existing.embedding());
            if (distance < minDistance) {
                minDistance = distance;
                matchedFace = faceRepository.findById(existing.faceId()).orElse(null);
            }
        }

        return new MatchResult(matchedFace, minDistance);
    }

    private double cosineDistance(List<Double> a, List<Double> b) {
        int size = Math.min(a.size(), b.size());
        if (size == 0) {
            return Double.MAX_VALUE;
        }

        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < size; i++) {
            double av = a.get(i);
            double bv = b.get(i);
            dot += av * bv;
            normA += av * av;
            normB += bv * bv;
        }

        if (normA == 0.0 || normB == 0.0) {
            return Double.MAX_VALUE;
        }

        return 1.0 - (dot / (Math.sqrt(normA) * Math.sqrt(normB)));
    }

    private String toJsonString(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new FaceServiceException("face persist failed: json serialization error", e);
        }
    }

    private List<Double> asDoubleList(Object value) {
        if (!(value instanceof List<?> list)) {
            return null;
        }

        List<Double> doubles = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Number num) {
                doubles.add(num.doubleValue());
            }
        }
        return doubles;
    }

    private Map<String, Object> asObjectMap(Object value) {
        if (value instanceof Map<?, ?> rawMap) {
            return objectMapper.convertValue(rawMap, new TypeReference<>() {});
        }
        return Collections.emptyMap();
    }

    public String regenerateFaceCover(Integer userId, String bboxJson, byte[] payload) {
        if (bboxJson == null || bboxJson.isBlank() || payload == null || payload.length == 0) {
            return "";
        }
        try {
            Map<String, Object> bbox = objectMapper.readValue(bboxJson, new TypeReference<>() {});
            return saveFaceCover(userId, bbox, payload);
        } catch (Exception e) {
            logger.warn("Failed to regenerate face cover for userId={}: {}", userId, e.getMessage());
            return "";
        }
    }

    public String ensureFaceCover(Integer userId, String currentCoverPath, String bboxJson, byte[] payload) {
        if (currentCoverPath != null && !currentCoverPath.isBlank()) {
            Path existingPath = Paths.get(currentCoverPath);
            if (Files.isRegularFile(existingPath)) {
                return existingPath.toString();
            }
        }
        return regenerateFaceCover(userId, bboxJson, payload);
    }

    private String saveFaceCover(Integer userId, Map<String, Object> bbox, byte[] payload) {
        if (payload == null || payload.length == 0 || userId == null) {
            return "";
        }

        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(payload));
            if (image == null) {
                return "";
            }

            int x = asInt(bbox.get("x"), 0);
            int y = asInt(bbox.get("y"), 0);
            int w = asInt(bbox.get("w"), image.getWidth());
            int h = asInt(bbox.get("h"), image.getHeight());

            // 以人脸中心为基准，按 2 倍扩展裁剪区域，并限制在图片边界内
            double paddingRatio = 2;
            int centerX = x + w / 2;
            int centerY = y + h / 2;
            int newW = (int) (w * paddingRatio);
            int newH = (int) (h * paddingRatio);

            int x1 = Math.max(0, centerX - newW / 2);
            int y1 = Math.max(0, centerY - newH / 2);
            int x2 = Math.min(image.getWidth(), x1 + newW);
            int y2 = Math.min(image.getHeight(), y1 + newH);

            // 如果某一侧顶到边界，尝试向另一侧补偿，保持尽可能大的裁剪区域
            if (x2 - x1 < newW && x1 > 0) {
                x1 = Math.max(0, x2 - newW);
            }
            if (y2 - y1 < newH && y1 > 0) {
                y1 = Math.max(0, y2 - newH);
            }

            if (x2 <= x1 || y2 <= y1) {
                return "";
            }

            BufferedImage crop = image.getSubimage(x1, y1, x2 - x1, y2 - y1);
            BufferedImage rgbCrop = new BufferedImage(crop.getWidth(), crop.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = rgbCrop.createGraphics();
            try {
                graphics.drawImage(crop, 0, 0, null);
            } finally {
                graphics.dispose();
            }

            Path coverDirPath = Paths.get(coversDir);
            Files.createDirectories(coverDirPath);

            String coverName = "user_" + userId + "_face_" + UUID.randomUUID().toString().replace("-", "") + ".jpg";
            Path coverPath = coverDirPath.resolve(coverName);
            boolean written = ImageIO.write(rgbCrop, "jpg", coverPath.toFile());
            if (!written || !Files.isRegularFile(coverPath) || Files.size(coverPath) == 0) {
                logger.warn("Failed to persist face cover file: userId={}, path={}, written={}", userId, coverPath, written);
                return "";
            }
            return coverPath.toString();
        } catch (IOException e) {
            logger.warn("Failed to save face cover for userId={}: {}", userId, e.getMessage());
            return "";
        }
    }

    private int asInt(Object value, int defaultValue) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return defaultValue;
    }

    private void cleanupFacesWithoutAppearances(Set<Integer> faceIds) {
        for (Integer faceId : faceIds) {
            if (faceId == null || faceAppearanceRepository.countByFaceId(faceId) > 0) {
                continue;
            }
            faceRepository.findById(faceId).ifPresent(faceRepository::delete);
        }
    }

    private record ParsedFaceEmbedding(Integer faceId, List<Double> embedding) {
    }

    private record MatchResult(Face face, double distance) {
    }
}
