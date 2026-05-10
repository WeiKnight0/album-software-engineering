package com.photo.backend.asset.service;

import com.photo.backend.common.entity.Face;
import com.photo.backend.common.entity.FaceAppearance;
import com.photo.backend.common.entity.Image;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.repository.FaceAppearanceRepository;
import com.photo.backend.common.repository.FaceRepository;
import com.photo.backend.common.repository.ImageRepository;
import com.photo.backend.rag.service.RagVectorClient;
import com.photo.backend.rag.service.ImageAnalysisService;
import com.photo.backend.face.service.FaceModelClient;
import com.photo.backend.face.service.FaceRecognitionPersistenceService;
import com.photo.backend.util.MetadataUtil;
import com.photo.backend.util.ThumbnailUtil;
import com.photo.backend.user.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;

@Service
public class ImageService {
    private static final Logger logger = LoggerFactory.getLogger(ImageService.class);

    @Autowired
    private ImageRepository imageRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private FaceModelClient faceModelClient;

    @Autowired
    private FaceRecognitionPersistenceService faceRecognitionPersistenceService;

    @Autowired
    private FaceAppearanceRepository faceAppearanceRepository;

    @Autowired
    private FaceRepository faceRepository;

    @Autowired
    private RagVectorClient ragVectorClient;

    @Autowired
    private ImageAnalysisService imageAnalysisService;

    @Value("${upload.base-path:uploads}")
    private String baseUploadDir;

    private String getBaseUploadDir() {
        String normalized = baseUploadDir == null || baseUploadDir.isBlank() ? "uploads" : baseUploadDir;
        return normalized.endsWith(File.separator) ? normalized : normalized + File.separator;
    }

    private String getUserUploadDir(Integer userId) {
        return getBaseUploadDir() + "user_" + userId + File.separator + "images" + File.separator;
    }

    private String getUserThumbnailDir(Integer userId) {
        return getBaseUploadDir() + "user_" + userId + File.separator + "thumbnails" + File.separator;
    }

    public Image uploadImage(MultipartFile file, Integer userId, Integer folderId) throws IOException {
        logger.info("=== UPLOAD START ===");
        logger.info("Upload attempt - userId: {}, folderId: {}, fileName: {}, fileSize: {}, contentType: {}",
            userId, folderId, file.getOriginalFilename(), file.getSize(), file.getContentType());

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("文件不能为空");
        }
        if (!userService.checkStorageLimit(userId, file.getSize())) {
            logger.warn("Storage limit exceeded for user: {}", userId);
            throw new RuntimeException("Storage limit exceeded");
        }
        logger.info("Storage check passed");

        String userUploadDir = getUserUploadDir(userId);
        String userThumbnailDir = getUserThumbnailDir(userId);

        File uploadDir = new File(userUploadDir);
        File thumbnailDir = new File(userThumbnailDir);

        if (!uploadDir.exists()) {
            boolean created = uploadDir.mkdirs();
            logger.info("Created user upload directory: {}, result: {}", userUploadDir, created);
        }

        if (!thumbnailDir.exists()) {
            boolean created = thumbnailDir.mkdirs();
            logger.info("Created user thumbnail directory: {}, result: {}", userThumbnailDir, created);
        }

        String uuid = UUID.randomUUID().toString();
        String originalFilename = file.getOriginalFilename();
        logger.info("Original filename: {}, uuid: {}", originalFilename, uuid);

        String extension = detectImageExtension(file);
        String storedFilename = uuid + extension;
        logger.info("Stored filename will be: {}", storedFilename);

        File dest = new File(userUploadDir + storedFilename);
        logger.info("Saving file to: {}", dest.getAbsolutePath());

        try {
            file.transferTo(dest);
            validateStoredImage(dest.toPath());
            logger.info("File saved successfully, exists: {}", dest.exists());
        } catch (Exception e) {
            Files.deleteIfExists(dest.toPath());
            logger.error("Error saving file: {}", e.getMessage(), e);
            throw e;
        }

        logger.info("Extracting EXIF metadata...");
        LocalDateTime captureTime = MetadataUtil.extractCaptureTime(dest);
        Double[] gpsCoordinates = MetadataUtil.extractGpsCoordinates(dest);
        logger.info("EXIF extracted - captureTime: {}, gps: {}", captureTime, gpsCoordinates);

        logger.info("Generating thumbnail...");
        String thumbnailFilename = null;
        try {
            thumbnailFilename = ThumbnailUtil.generateThumbnail(dest, userThumbnailDir, uuid);
            logger.info("Thumbnail generated: {}", thumbnailFilename);
        } catch (Exception e) {
            logger.warn("Failed to generate thumbnail: {}", e.getMessage());
        }

        Image image = new Image();
        image.setId(uuid);
        image.setUserId(userId);
        image.setFolderId(folderId);
        image.setOriginalFilename(originalFilename);
        image.setStoredFilename(storedFilename);
        image.setThumbnailFilename(thumbnailFilename);
        image.setFileSize((int) file.getSize());
        image.setMimeType(mimeTypeForExtension(extension));
        image.setUploadTime(LocalDateTime.now());
        image.setIsInRecycleBin(false);

        logger.info("Saving image to database...");

        Image savedImage;
        try {
            savedImage = imageRepository.save(image);
            logger.info("Image saved to database, id: {}", savedImage.getId());
        } catch (Exception e) {
            logger.error("Database error: {}", e.getMessage(), e);
            throw e;
        }

        // 会员自动触发人脸识别分类
        try {
            User user = userService.getUserById(userId);
            boolean isActiveMember = user.getIsMember() != null && user.getIsMember()
                    && user.getMembershipExpireAt() != null
                    && user.getMembershipExpireAt().isAfter(LocalDateTime.now());
            logger.info("Membership check for user {}: isMember={}, expireAt={}, active={}",
                userId, user.getIsMember(), user.getMembershipExpireAt(), isActiveMember);
            if (isActiveMember) {
                byte[] fileBytes = Files.readAllBytes(dest.toPath());
                logger.info("Calling face recognition for imageId: {}, fileSize: {}", savedImage.getId(), fileBytes.length);
                // 直接调用模型和持久化，绕过 FaceService 代理，避免 REQUIRES_NEW 跨事务查不到数据
                java.util.Map<String, Object> inferResult = faceModelClient.infer(userId, savedImage.getId(), fileBytes);
                int faceCount = faceRecognitionPersistenceService.persistInferResult(userId, savedImage.getId(), fileBytes, inferResult);
                logger.info("Face recognition completed for imageId: {}, faces found: {}", savedImage.getId(), faceCount);
            } else {
                logger.info("Skip face recognition for user {}: not an active member", userId);
            }
        } catch (Exception e) {
            logger.error("Face recognition failed for image {}: {}", savedImage.getId(), e.getMessage(), e);
        }

        // 会员异步构建向量索引（独立 try-catch，确保即使人脸识别失败也会创建分析记录）
        try {
            User user = userService.getUserById(userId);
            boolean isActiveMember = user.getIsMember() != null && user.getIsMember()
                    && user.getMembershipExpireAt() != null
                    && user.getMembershipExpireAt().isAfter(LocalDateTime.now());
            if (isActiveMember) {
                logger.info("Queueing vector index for imageId: {}, path: {}", savedImage.getId(), dest.getAbsolutePath());
                imageAnalysisService.createPendingRecord(userId, savedImage.getId(), "RAG");
                // 使用 TransactionSynchronization 确保当前事务提交后再触发异步任务，
                // 避免 @Async 新线程在事务提交前查询不到刚创建的 PENDING 记录。
                if (TransactionSynchronizationManager.isSynchronizationActive()) {
                    final String finalImageId = savedImage.getId();
                    final String finalImagePath = dest.getAbsolutePath();
                    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            logger.info("Transaction committed, triggering vector index for imageId={}", finalImageId);
                            imageAnalysisService.runVectorIndexAsync(userId, finalImageId, finalImagePath);
                        }
                    });
                } else {
                    imageAnalysisService.runVectorIndexAsync(userId, savedImage.getId(), dest.getAbsolutePath());
                }
            } else {
                logger.info("Skip vector ingest for user {}: not an active member", userId);
            }
        } catch (Exception e) {
            logger.error("Vector index setup failed for image {}: {}", savedImage.getId(), e.getMessage(), e);
        }

        logger.info("Updating user storage...");
        userService.updateStorageUsed(userId, file.getSize());

        logger.info("=== UPLOAD COMPLETE ===");
        return savedImage;
    }

    private String detectImageExtension(MultipartFile file) throws IOException {
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String originalFilename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!contentType.startsWith("image/")) {
            throw new RuntimeException("仅支持图片文件");
        }
        if (contentType.contains("png") || originalFilename.endsWith(".png")) return ".png";
        if (contentType.contains("webp") || originalFilename.endsWith(".webp")) return ".webp";
        if (contentType.contains("jpeg") || contentType.contains("jpg") || originalFilename.endsWith(".jpg") || originalFilename.endsWith(".jpeg")) return ".jpg";
        throw new RuntimeException("仅支持 JPG、PNG、WEBP 图片");
    }

    private void validateStoredImage(Path path) throws IOException {
        if (ImageIO.read(path.toFile()) == null) {
            throw new RuntimeException("无效的图片文件");
        }
    }

    private String mimeTypeForExtension(String extension) {
        return switch (extension) {
            case ".png" -> "image/png";
            case ".webp" -> "image/webp";
            default -> "image/jpeg";
        };
    }

    public void deleteImage(String imageId, Integer userId) {
        Optional<Image> imageOptional = imageRepository.findByIdAndUserId(imageId, userId);
        if (!imageOptional.isPresent()) {
            throw new RuntimeException("Image not found");
        }

        Image image = imageOptional.get();

        image.setIsInRecycleBin(true);
        image.setOriginalFolderId(image.getFolderId());
        image.setFolderId(null);
        image.setMovedToBinAt(LocalDateTime.now());

        imageRepository.save(image);
    }

    public void restoreImage(String imageId, Integer userId) {
        Optional<Image> imageOptional = imageRepository.findByIdAndUserId(imageId, userId);
        if (!imageOptional.isPresent()) {
            throw new RuntimeException("Image not found");
        }

        Image image = imageOptional.get();

        if (!image.getIsInRecycleBin()) {
            throw new RuntimeException("Image is not in recycle bin");
        }

        image.setIsInRecycleBin(false);
        image.setFolderId(image.getOriginalFolderId());
        image.setOriginalFolderId(null);
        image.setMovedToBinAt(null);

        imageRepository.save(image);
    }

    public void permanentlyDeleteImage(String imageId, Integer userId) {
        Optional<Image> imageOptional = imageRepository.findByIdAndUserId(imageId, userId);
        if (!imageOptional.isPresent()) {
            throw new RuntimeException("Image not found");
        }

        Image image = imageOptional.get();

        String userUploadDir = getUserUploadDir(userId);
        File file = new File(userUploadDir + image.getStoredFilename());
        if (file.exists()) {
            file.delete();
            logger.info("Deleted image file: {}", file.getAbsolutePath());
        }

        String userThumbnailDir = getUserThumbnailDir(userId);
        if (image.getThumbnailFilename() != null) {
            File thumbnailFile = new File(userThumbnailDir + image.getThumbnailFilename());
            if (thumbnailFile.exists()) {
                thumbnailFile.delete();
                logger.info("Deleted thumbnail file: {}", thumbnailFile.getAbsolutePath());
            }
        }

        // 清理关联的人脸数据及封面图
        cleanupFaceData(imageId, userId);

        userService.decreaseStorageUsed(userId, image.getFileSize());

        // 同步删除向量索引
        try {
            ragVectorClient.deleteVector(userId, imageId);
        } catch (Exception e) {
            logger.warn("Failed to delete vector for image {}: {}", imageId, e.getMessage());
        }

        // 删除分析状态记录
        try {
            imageAnalysisService.deleteByImageId(imageId);
        } catch (Exception e) {
            logger.warn("Failed to delete analysis record for image {}: {}", imageId, e.getMessage());
        }

        imageRepository.delete(image);
    }

    private void cleanupFaceData(String imageId, Integer userId) {
        try {
            List<FaceAppearance> appearances = faceAppearanceRepository.findByImageId(imageId);
            if (appearances.isEmpty()) {
                return;
            }

            java.util.Set<Integer> affectedFaceIds = new java.util.HashSet<>();
            for (FaceAppearance appearance : appearances) {
                affectedFaceIds.add(appearance.getFaceId());
            }

            faceAppearanceRepository.deleteAll(appearances);
            logger.info("Deleted {} face appearance(s) for image {}", appearances.size(), imageId);

            for (Integer faceId : affectedFaceIds) {
                long remainingCount = faceAppearanceRepository.countByFaceId(faceId);
                if (remainingCount == 0) {
                    faceRepository.findByIdAndUserId(faceId, userId).ifPresent(face -> {
                        deleteFaceCoverFile(face);
                        faceRepository.delete(face);
                        logger.info("Deleted empty face classification: faceId={}", faceId);
                    });
                } else {
                    // face 还有关联照片，尝试用剩余照片重新生成封面
                    faceRepository.findByIdAndUserId(faceId, userId).ifPresent(face -> {
                        List<FaceAppearance> remaining = faceAppearanceRepository.findByFaceId(faceId);
                        if (!remaining.isEmpty()) {
                            FaceAppearance first = remaining.get(0);
                            File remainingImageFile = getImageFile(first.getImageId(), userId);
                            if (remainingImageFile != null && remainingImageFile.exists()) {
                                try {
                                    byte[] payload = Files.readAllBytes(remainingImageFile.toPath());
                                    String newCoverPath = faceRecognitionPersistenceService.regenerateFaceCover(
                                            userId, first.getBbox(), payload);
                                    if (newCoverPath != null && !newCoverPath.isBlank()) {
                                        deleteFaceCoverFile(face);
                                        face.setCoverPath(newCoverPath);
                                        faceRepository.save(face);
                                        logger.info("Regenerated face cover for faceId={}", faceId);
                                    }
                                } catch (Exception e) {
                                    logger.warn("Failed to regenerate cover for faceId={}: {}", faceId, e.getMessage());
                                }
                            }
                        }
                    });
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to cleanup face data for image {}: {}", imageId, e.getMessage());
        }
    }

    private void deleteFaceCoverFile(Face face) {
        if (face.getCoverPath() != null && !face.getCoverPath().isBlank()) {
            File coverFile = new File(face.getCoverPath());
            if (coverFile.exists()) {
                coverFile.delete();
                logger.info("Deleted face cover file: {}", coverFile.getAbsolutePath());
            }
        }
    }

    public List<Image> getImagesByFolderId(Integer userId, Integer folderId) {
        return imageRepository.findByUserIdAndFolderId(userId, folderId);
    }

    public List<Image> getRecycleBinImages(Integer userId) {
        return imageRepository.findByUserIdAndIsInRecycleBin(userId, true);
    }

    public List<Image> getAllImages(Integer userId) {
        return imageRepository.findByUserIdAndIsInRecycleBinFalseOrderByUploadTimeDesc(userId);
    }

    public Image getImageById(String imageId, Integer userId) {
        Optional<Image> imageOptional = imageRepository.findByIdAndUserId(imageId, userId);
        if (!imageOptional.isPresent()) {
            throw new RuntimeException("Image not found");
        }
        return imageOptional.get();
    }

    public File getThumbnailFile(String imageId, Integer userId) {
        Image image = getImageById(imageId, userId);
        if (image.getThumbnailFilename() == null) {
            return null;
        }
        String userThumbnailDir = getUserThumbnailDir(userId);
        File thumbnailFile = new File(userThumbnailDir + image.getThumbnailFilename());
        if (!thumbnailFile.exists()) {
            return null;
        }
        return thumbnailFile;
    }

    public File getImageFile(String imageId, Integer userId) {
        Image image = getImageById(imageId, userId);
        String userUploadDir = getUserUploadDir(userId);
        File imageFile = new File(userUploadDir + image.getStoredFilename());
        if (!imageFile.exists()) {
            return null;
        }
        return imageFile;
    }

    public void moveImage(String imageId, Integer userId, Integer newFolderId) {
        Image image = getImageById(imageId, userId);
        image.setFolderId(newFolderId);
        imageRepository.save(image);
    }

    public int moveImages(List<String> imageIds, Integer userId, Integer newFolderId) {
        int count = 0;
        for (String imageId : imageIds) {
            try {
                Image image = getImageById(imageId, userId);
                image.setFolderId(newFolderId);
                imageRepository.save(image);
                count++;
            } catch (Exception e) {
                // Skip invalid images
            }
        }
        return count;
    }

    public int batchDeleteImages(List<String> imageIds, Integer userId, boolean permanent) {
        int count = 0;
        for (String imageId : imageIds) {
            try {
                if (permanent) {
                    permanentlyDeleteImage(imageId, userId);
                } else {
                    deleteImage(imageId, userId);
                }
                count++;
            } catch (Exception e) {
                // Skip invalid images
            }
        }
        return count;
    }

    public long getTotalImages(Integer userId) {
        return imageRepository.countByUserId(userId);
    }

    public long getTotalStorageUsed(Integer userId) {
        Long totalSize = imageRepository.getTotalFileSizeByUserId(userId);
        return totalSize != null ? totalSize : 0;
    }
}
