package com.photo.backend.face.service;

import com.photo.backend.common.entity.Face;
import com.photo.backend.common.repository.FaceAppearanceRepository;
import com.photo.backend.common.repository.FaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
/**
 * 人脸相册合并服务。
 *
 * <p>支持两阶段：
 * 1) 仅传 faceIds 预检查，若存在多个姓名返回候选列表；
 * 2) 传 selectedName 后执行合并，把多个 face 的出现记录归并到一个目标 face。</p>
 */
public class FaceMergeService {
    public static final String STATUS_NEED_NAME_SELECTION = "NEED_NAME_SELECTION";
    public static final String STATUS_MERGED = "MERGED";

    private final FaceRepository faceRepository;
    private final FaceAppearanceRepository faceAppearanceRepository;

    public FaceMergeService(FaceRepository faceRepository, FaceAppearanceRepository faceAppearanceRepository) {
        this.faceRepository = faceRepository;
        this.faceAppearanceRepository = faceAppearanceRepository;
    }

    @Transactional
    public FaceMergeResult mergeFaces(List<Integer> faceIds, String selectedName) {
        return mergeFaces(null, faceIds, selectedName);
    }

    @Transactional
    public FaceMergeResult mergeFaces(Integer userId, List<Integer> faceIds, String selectedName) {
        if (userId != null && userId <= 0) {
            throw new IllegalArgumentException("userId is invalid");
        }
        List<Integer> normalizedFaceIds = normalizeFaceIds(faceIds);
        List<Face> faces = loadAndValidateFaces(userId, normalizedFaceIds);
        List<String> candidateNames = collectCandidateNames(faces);

        String normalizedSelectedName = normalizeOptionalName(selectedName);
        if (candidateNames.size() > 1 && normalizedSelectedName == null) {
            return FaceMergeResult.needNameSelection(candidateNames);
        }

        if (normalizedSelectedName != null && !candidateNames.isEmpty() && !candidateNames.contains(normalizedSelectedName)) {
            throw new IllegalArgumentException("selectedName must be one of existing face names");
        }

        String mergedName = resolveMergedName(candidateNames, normalizedSelectedName);
        Face targetFace = pickTargetFace(faces, mergedName);

        List<Integer> sourceFaceIds = faces.stream()
            .map(Face::getId)
            .filter(id -> !Objects.equals(id, targetFace.getId()))
            .toList();

        int movedAppearanceCount = 0;
        if (!sourceFaceIds.isEmpty()) {
            movedAppearanceCount = faceAppearanceRepository.rebindFaceIds(sourceFaceIds, targetFace.getId());
            faceRepository.deleteAllByIdInBatch(sourceFaceIds);
        }

        touchMergedFace(targetFace, faces, mergedName);
        faceRepository.save(targetFace);

        return FaceMergeResult.merged(
            targetFace.getId(),
            targetFace.getFaceName(),
            movedAppearanceCount,
            normalizedFaceIds.size(),
            sourceFaceIds
        );
    }

    private List<Integer> normalizeFaceIds(List<Integer> faceIds) {
        if (faceIds == null || faceIds.isEmpty()) {
            throw new IllegalArgumentException("faceIds is required");
        }

        Set<Integer> dedup = new LinkedHashSet<>();
        for (Integer id : faceIds) {
            if (id == null || id <= 0) {
                throw new IllegalArgumentException("faceIds contains invalid value");
            }
            dedup.add(id);
        }

        if (dedup.size() < 2) {
            throw new IllegalArgumentException("at least two distinct faceIds are required");
        }
        return new ArrayList<>(dedup);
    }

    private List<Face> loadAndValidateFaces(Integer userId, List<Integer> faceIds) {
        List<Face> faces = faceRepository.findAllById(faceIds);
        if (faces.size() != faceIds.size()) {
            throw new NoSuchElementException("some faceIds do not exist");
        }

        Set<Integer> userIds = faces.stream().map(Face::getUserId).collect(Collectors.toSet());
        if (userIds.size() != 1) {
            throw new IllegalArgumentException("all faces must belong to the same user");
        }
        if (userId != null && !userIds.contains(userId)) {
            throw new NoSuchElementException("some faceIds do not exist");
        }
        return faces;
    }

    private List<String> collectCandidateNames(List<Face> faces) {
        return faces.stream()
            .map(Face::getFaceName)
            .map(this::normalizeOptionalName)
            .filter(Objects::nonNull)
            .distinct()
            .sorted()
            .toList();
    }

    private String resolveMergedName(List<String> candidateNames, String selectedName) {
        if (selectedName != null) {
            return selectedName;
        }
        return candidateNames.size() == 1 ? candidateNames.get(0) : null;
    }

    private Face pickTargetFace(List<Face> faces, String mergedName) {
        if (mergedName != null) {
            return faces.stream()
                .filter(face -> mergedName.equals(normalizeOptionalName(face.getFaceName())))
                .min(Comparator.comparing(Face::getId))
                .orElseGet(() -> faces.stream().min(Comparator.comparing(Face::getId)).orElseThrow());
        }
        return faces.stream().min(Comparator.comparing(Face::getId)).orElseThrow();
    }

    private void touchMergedFace(Face targetFace, List<Face> sourceFaces, String mergedName) {
        if (mergedName != null) {
            targetFace.setFaceName(mergedName);
        }

        if (targetFace.getCoverPath() == null || targetFace.getCoverPath().isBlank()) {
            sourceFaces.stream()
                .map(Face::getCoverPath)
                .filter(path -> path != null && !path.isBlank())
                .findFirst()
                .ifPresent(targetFace::setCoverPath);
        }

        LocalDateTime maxLastSeenAt = sourceFaces.stream()
            .map(Face::getLastSeenAt)
            .filter(Objects::nonNull)
            .max(Comparator.naturalOrder())
            .orElse(targetFace.getLastSeenAt());
        targetFace.setLastSeenAt(maxLastSeenAt);
    }

    private String normalizeOptionalName(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > 100) {
            throw new IllegalArgumentException("faceName is too long");
        }
        return trimmed;
    }

    public record FaceMergeResult(
        String statusCode,
        Integer mergedFaceId,
        String mergedFaceName,
        List<String> candidateNames,
        Integer movedAppearanceCount,
        Integer requestedFaceCount,
        List<Integer> removedFaceIds
    ) {
        public static FaceMergeResult needNameSelection(List<String> candidateNames) {
            return new FaceMergeResult(
                STATUS_NEED_NAME_SELECTION,
                null,
                null,
                candidateNames,
                null,
                null,
                List.of()
            );
        }

        public static FaceMergeResult merged(
            Integer mergedFaceId,
            String mergedFaceName,
            Integer movedAppearanceCount,
            Integer requestedFaceCount,
            List<Integer> removedFaceIds
        ) {
            return new FaceMergeResult(
                STATUS_MERGED,
                mergedFaceId,
                mergedFaceName,
                List.of(),
                movedAppearanceCount,
                requestedFaceCount,
                removedFaceIds
            );
        }
    }
}

