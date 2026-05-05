package com.photo.backend.face.service;

import com.photo.backend.common.entity.Face;
import com.photo.backend.common.entity.FaceAppearance;
import com.photo.backend.common.entity.Image;
import com.photo.backend.common.repository.FaceAppearanceRepository;
import com.photo.backend.common.repository.FaceRepository;
import com.photo.backend.common.repository.ImageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * 人脸业务编排服务。
 *
 * <p>这个类不直接做复杂算法，而是负责把“图片已上传/已落盘”这类上游数据，
 * 统一交给人脸模型调用、结果落库、人物备注等子服务处理。</p>
 */
@Service
public class FaceService {
    private final FaceModelClient faceModelClient;
    private final FaceRecognitionPersistenceService persistenceService;
    private final FaceRemarkService faceRemarkService;
    private final FaceMergeService faceMergeService;
    private final FaceDeleteService faceDeleteService;
    private final FaceAppearanceRepository faceAppearanceRepository;
    private final ImageRepository imageRepository;
    private final FaceRepository faceRepository;

    public FaceService(
        FaceModelClient faceModelClient,
        FaceRecognitionPersistenceService persistenceService,
        FaceRemarkService faceRemarkService,
        FaceMergeService faceMergeService,
        FaceDeleteService faceDeleteService,
        FaceAppearanceRepository faceAppearanceRepository,
        ImageRepository imageRepository,
        FaceRepository faceRepository
    ) {
        this.faceModelClient = faceModelClient;
        this.persistenceService = persistenceService;
        this.faceRemarkService = faceRemarkService;
        this.faceMergeService = faceMergeService;
        this.faceDeleteService = faceDeleteService;
        this.faceAppearanceRepository = faceAppearanceRepository;
        this.imageRepository = imageRepository;
        this.faceRepository = faceRepository;
    }

    /**
     * 适用于“上传接口直接带着 MultipartFile” 的场景。
     *
     * <p>先把文件内容读出来，再转交给统一的 byte[] 入口，避免业务逻辑分散。</p>
     */
    @Transactional
    public int onImageUploaded(Integer userId, String imageId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FaceServiceException("face model request failed: image file is empty");
        }

        try {
            // 读取上传文件内容后，复用下面的统一入口。
            return onImageUploaded(
                userId,
                imageId,
                file.getBytes()
            );
        } catch (IOException e) {
            throw new FaceServiceException("face model request failed: unable to read file bytes", e);
        }
    }

    /**
     * 统一的人脸识别入库入口。
     *
     * <p>上游在图片元数据落库后，直接把图片 payload 传入即可，
     * 避免在业务层重复读取磁盘文件。</p>
     */
    @Transactional
    public int onImageUploaded(Integer userId, String imageId, byte[] payload) {
        // 做最基本的入参校验，避免空数据继续下沉到模型或数据库层。
        validateAnalyzeInput(userId, imageId, payload);

        // 1) 调用外部/下游模型服务做人脸识别。
        // 2) 把模型结果交给持久化服务，写入 Face / FaceAppearance。
        Map<String, Object> inferResult = faceModelClient.infer(userId, imageId, payload);
        return persistenceService.persistInferResult(userId, imageId, payload, inferResult);
    }



    /**
     * 更新某个 face 的人物姓名备注。
     */
    @Transactional
    public Face updateFaceName(Integer faceId, String faceName) {
        return faceRemarkService.updateFaceName(faceId, faceName);
    }

    /**
     * 更新当前用户下某个 face 的人物姓名备注。
     */
    @Transactional
    public Face updateFaceName(Integer userId, Integer faceId, String faceName) {
        return faceRemarkService.updateFaceName(userId, faceId, faceName);
    }

    /**
     * 合并多个已分类的人脸相册。
     */
    @Transactional
    public FaceMergeService.FaceMergeResult mergeFaces(java.util.List<Integer> faceIds, String selectedName) {
        return faceMergeService.mergeFaces(faceIds, selectedName);
    }

    /**
     * 合并当前用户下的多个已分类人脸相册。
     */
    @Transactional
    public FaceMergeService.FaceMergeResult mergeFaces(Integer userId, java.util.List<Integer> faceIds, String selectedName) {
        return faceMergeService.mergeFaces(userId, faceIds, selectedName);
    }

    /**
     * 删除指定 face 的人物分类（不删除图片）。
     */
    @Transactional
    public FaceDeleteService.FaceDeleteResult deleteFaceClassification(Integer faceId) {
        return faceDeleteService.deleteFaceClassification(faceId);
    }

    /**
     * 删除当前用户下指定 face 的人物分类（不删除图片）。
     */
    @Transactional
    public FaceDeleteService.FaceDeleteResult deleteFaceClassification(Integer userId, Integer faceId) {
        return faceDeleteService.deleteFaceClassification(userId, faceId);
    }

    /**
     * 按姓名搜索当前用户的人物分类编号。
     * 姓名匹配规则：trim 后大小写敏感精确匹配。
     */
    @Transactional(readOnly = true)
    public FaceNameSearchResult searchFaceCategoryIds(Integer userId, String faceName) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId is invalid");
        }
        if (faceName == null || faceName.isBlank()) {
            throw new IllegalArgumentException("faceName is required");
        }

        String normalizedName = faceName.trim();
        if (normalizedName.length() > 100) {
            throw new IllegalArgumentException("faceName is too long");
        }

        List<Integer> categoryIds = faceRepository.findByUserIdAndFaceNameOrderByIdAsc(userId, normalizedName)
            .stream()
            .map(Face::getId)
            .toList();

        String statusCode = categoryIds.isEmpty() ? "NOT_FOUND" : "FOUND";
        return new FaceNameSearchResult(statusCode, categoryIds);
    }

    public record FaceNameSearchResult(String statusCode, List<Integer> categoryIds) {
    }

    /**
     * 查询当前用户的全部人物分类列表。
     * 过滤掉所有关联图片均已进入回收站的人物。
     */
    @Transactional(readOnly = true)
    public List<Face> listFacesByUserId(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId is invalid");
        }
        List<Face> faces = faceRepository.findByUserIdOrderByLastSeenAtDesc(userId);
        List<Face> result = new java.util.ArrayList<>();
        for (Face face : faces) {
            List<FaceAppearance> appearances = faceAppearanceRepository.findByFaceId(face.getId());
            if (appearances.isEmpty()) {
                continue;
            }
            List<String> imageIds = appearances.stream()
                .map(FaceAppearance::getImageId)
                .distinct()
                .toList();
            List<Image> images = imageRepository.findAllById(imageIds);
            boolean hasVisibleImage = images.stream()
                .anyMatch(img -> !Boolean.TRUE.equals(img.getIsInRecycleBin()));
            if (hasVisibleImage) {
                result.add(face);
            }
        }
        return result;
    }

    /**
     * 查询某人物分类下的全部图片。
     */
    @Transactional(readOnly = true)
    public List<Image> getImagesByFaceId(Integer userId, Integer faceId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId is invalid");
        }
        if (faceId == null || faceId <= 0) {
            throw new IllegalArgumentException("faceId is invalid");
        }
        Face face = faceRepository.findByIdAndUserId(faceId, userId)
            .orElseThrow(() -> new NoSuchElementException("Face not found"));
        List<FaceAppearance> appearances = faceAppearanceRepository.findByFaceIdOrderByCreatedAtDesc(face.getId());
        List<String> imageIds = appearances.stream().map(FaceAppearance::getImageId).distinct().toList();
        return imageRepository.findAllById(imageIds).stream()
            .filter(img -> !Boolean.TRUE.equals(img.getIsInRecycleBin()))
            .toList();
    }

    /**
     * 校验识别入库所需的最小参数。
     */
    private void validateAnalyzeInput(Integer userId, String imageId, byte[] payload) {
        if (userId == null) {
            throw new FaceServiceException("face persist failed: userId is required");
        }
        if (imageId == null || imageId.isBlank()) {
            throw new FaceServiceException("face persist failed: imageId is required");
        }
        if (payload == null || payload.length == 0) {
            throw new FaceServiceException("face persist failed: payload is empty");
        }

        boolean belongsToUser = imageRepository.findByIdAndUserId(imageId, userId).isPresent();
        if (!belongsToUser) {
            throw new FaceServiceException("face persist failed: image does not belong to current user");
        }
    }
}
