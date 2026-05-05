package com.photo.backend.face.service;

import com.photo.backend.common.entity.Face;
import com.photo.backend.common.repository.FaceAppearanceRepository;
import com.photo.backend.common.repository.FaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/**
 * 人脸分类删除服务。
 *
 * <p>仅删除 Face 与其出现记录 FaceAppearance，不删除 Image 原图记录。</p>
 */
@Service
public class FaceDeleteService {
    public static final String STATUS_DELETED = "DELETED";

    private final FaceRepository faceRepository;
    private final FaceAppearanceRepository faceAppearanceRepository;

    public FaceDeleteService(FaceRepository faceRepository, FaceAppearanceRepository faceAppearanceRepository) {
        this.faceRepository = faceRepository;
        this.faceAppearanceRepository = faceAppearanceRepository;
    }

    @Transactional
    public FaceDeleteResult deleteFaceClassification(Integer faceId) {
        return deleteFaceClassification(null, faceId);
    }

    @Transactional
    public FaceDeleteResult deleteFaceClassification(Integer userId, Integer faceId) {
        if (userId != null && userId <= 0) {
            throw new IllegalArgumentException("userId is invalid");
        }
        if (faceId == null || faceId <= 0) {
            throw new IllegalArgumentException("faceId is invalid");
        }

        Face face = (userId == null)
            ? faceRepository.findById(faceId).orElseThrow(() -> new NoSuchElementException("face not found"))
            : faceRepository.findByIdAndUserId(faceId, userId).orElseThrow(() -> new NoSuchElementException("face not found"));

        int removedAppearanceCount = Math.toIntExact(faceAppearanceRepository.countByFaceId(face.getId()));
        faceAppearanceRepository.deleteByFaceId(face.getId());
        faceRepository.delete(face);

        return FaceDeleteResult.deleted(face.getId(), removedAppearanceCount);
    }

    public record FaceDeleteResult(
        String statusCode,
        Integer removedFaceId,
        Integer removedAppearanceCount
    ) {
        public static FaceDeleteResult deleted(Integer removedFaceId, Integer removedAppearanceCount) {
            return new FaceDeleteResult(STATUS_DELETED, removedFaceId, removedAppearanceCount);
        }
    }
}

