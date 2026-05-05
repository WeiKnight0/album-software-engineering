package com.photo.backend.face.service;

import com.photo.backend.common.entity.Face;
import com.photo.backend.common.repository.FaceRepository;
import org.springframework.stereotype.Service;

import java.util.NoSuchElementException;

@Service
/**
 * 人物备注服务。
 *
 * <p>职责很单一：根据 faceId 找到 Face 记录，然后把 faceName 写回数据库。</p>
 */
public class FaceRemarkService {
    private final FaceRepository faceRepository;

    public FaceRemarkService(FaceRepository faceRepository) {
        this.faceRepository = faceRepository;
    }

    /**
     * 更新指定人脸的人物姓名备注。
     *
     * @param faceId   人脸主键
     * @param faceName 用户填写的人物姓名，保存前会做 trim 处理
     */
    public Face updateFaceName(Integer faceId, String faceName) {
        return updateFaceName(null, faceId, faceName);
    }

    public Face updateFaceName(Integer userId, Integer faceId, String faceName) {
        if (faceId == null) {
            throw new IllegalArgumentException("faceId is required");
        }
        if (userId != null && userId <= 0) {
            throw new IllegalArgumentException("userId is invalid");
        }
        if (faceName == null || faceName.isBlank()) {
            throw new IllegalArgumentException("faceName is required");
        }

        // 去掉首尾空白，避免数据库里存入无意义空格。
        String normalizedName = faceName.trim();
        if (normalizedName.length() > 100) {
            throw new IllegalArgumentException("faceName is too long");
        }

        // 先查再改，找不到时直接返回“未找到”异常。
        Face face = (userId == null)
            ? faceRepository.findById(faceId).orElseThrow(() -> new NoSuchElementException("Face not found"))
            : faceRepository.findByIdAndUserId(faceId, userId)
                .orElseThrow(() -> new NoSuchElementException("Face not found"));
        face.setFaceName(normalizedName);
        return faceRepository.save(face);
    }
}

