package com.photo.backend.asset.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.Image;
import com.photo.backend.common.entity.ImageAnalysis;
import com.photo.backend.common.repository.ImageAnalysisRepository;
import com.photo.backend.asset.service.ImageService;
import com.photo.backend.asset.service.UploadService;
import com.photo.backend.user.service.CurrentUserService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/images")
public class ImageController {
    private static final Logger logger = LoggerFactory.getLogger(ImageController.class);

    @Autowired
    private ImageService imageService;

    @Autowired
    private UploadService uploadService;

    @Autowired
    private ImageAnalysisRepository imageAnalysisRepository;

    @Autowired
    private CurrentUserService currentUserService;

    @PostMapping
    public ResponseEntity<ApiResponse<Image>> uploadImage(@RequestParam("file") MultipartFile file,
                                       @RequestParam(value = "folderId", required = false) Integer folderId) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            Image image = imageService.uploadImage(file, userId, folderId);

            try {
                uploadService.recordSimpleUpload(image.getId(), userId, file.getOriginalFilename(), file.getSize());
            } catch (Exception e) {
                logger.warn("Failed to record upload history: {}", e.getMessage());
            }

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(image, "图片上传成功"));
        } catch (IOException e) {
            logger.error("IOException in upload: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Upload failed: " + e.getMessage(), "UPLOAD_FAILED"));
        } catch (Exception e) {
            logger.error("Exception in upload: {} - {}", e.getClass().getName(), e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "UPLOAD_FAILED"));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Image>>> getImages(
            @RequestParam(required = false) Integer folderId,
            @RequestParam(required = false, defaultValue = "all") String status) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            List<Image> images;
            if ("recycle".equals(status)) {
                images = imageService.getRecycleBinImages(userId);
            } else if (folderId != null) {
                images = imageService.getImagesByFolderId(userId, folderId);
            } else {
                images = imageService.getAllImages(userId);
            }
            return ResponseEntity.ok(ApiResponse.success(images));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Get images failed: " + e.getMessage(), "GET_IMAGES_FAILED"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Image>> getImage(@PathVariable String id) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            Image image = imageService.getImageById(id, userId);
            return ResponseEntity.ok(ApiResponse.success(image));
        } catch (Exception e) {
            return ResponseEntity.notFound()
                .build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(
            @PathVariable String id,
            @RequestParam(required = false, defaultValue = "false") Boolean permanent) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            if (permanent) {
                imageService.permanentlyDeleteImage(id, userId);
            } else {
                imageService.deleteImage(id, userId);
            }
            return ResponseEntity.ok(ApiResponse.success("图片删除成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "DELETE_FAILED"));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateImage(
            @PathVariable String id,
            @RequestBody Map<String, Object> request) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            Object folderIdObj = request.get("folderId");
            Integer newFolderId = folderIdObj instanceof Number ? ((Number) folderIdObj).intValue() : null;
            Boolean restore = (Boolean) request.get("restore");

            if (restore != null && restore) {
                imageService.restoreImage(id, userId);
                return ResponseEntity.ok(ApiResponse.success("图片恢复成功"));
            }

            if (newFolderId != null) {
                imageService.moveImage(id, userId, newFolderId);
                return ResponseEntity.ok(ApiResponse.success("图片移动成功"));
            }

            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid operation", "INVALID_OPERATION"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "UPDATE_FAILED"));
        }
    }

    @PostMapping("/batch-move")
    public ResponseEntity<ApiResponse<Map<String, Object>>> batchMoveImages(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> imageIds = (List<String>) request.get("imageIds");
            Integer userId = currentUserService.getCurrentUserId();
            Object folderIdObj = request.get("folderId");
            Integer newFolderId = folderIdObj instanceof Number ? ((Number) folderIdObj).intValue() : null;

            if (imageIds == null || imageIds.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Please select images to move", "NO_IMAGES_SELECTED"));
            }

            int count = imageService.moveImages(imageIds, userId, newFolderId);

            return ResponseEntity.ok(ApiResponse.success(Map.of(
                "movedCount", count,
                "totalCount", imageIds.size()
            ), "Moved " + count + " images"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Batch move failed: " + e.getMessage(), "BATCH_MOVE_FAILED"));
        }
    }

    @DeleteMapping("/batch-delete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> batchDeleteImages(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> imageIds = (List<String>) request.get("imageIds");
            Integer userId = currentUserService.getCurrentUserId();
            Boolean permanent = (Boolean) request.getOrDefault("permanent", false);

            if (imageIds == null || imageIds.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Please select images to delete", "NO_IMAGES_SELECTED"));
            }

            int count = imageService.batchDeleteImages(imageIds, userId, permanent != null && permanent);

            return ResponseEntity.ok(ApiResponse.success(Map.of(
                "deletedCount", count,
                "totalCount", imageIds.size()
            ), "Deleted " + count + " images"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Batch delete failed: " + e.getMessage(), "BATCH_DELETE_FAILED"));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getImageStats() {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            long totalImages = imageService.getTotalImages(userId);
            long totalStorage = imageService.getTotalStorageUsed(userId);
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                "totalImages", totalImages,
                "totalStorage", totalStorage
            )));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Stats failed: " + e.getMessage(), "STATS_FAILED"));
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadImage(@PathVariable String id) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            Image image = imageService.getImageById(id, userId);
            File file = imageService.getImageFile(id, userId);
            if (file == null || !file.exists()) {
                return ResponseEntity.notFound().build();
            }

            String safeFilename = safeDownloadFilename(image.getOriginalFilename());
            String encodedFilename = java.net.URLEncoder.encode(safeFilename, "UTF-8").replace("+", "%20");

            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(image.getMimeType()))
                    .header("Content-Disposition", "attachment; filename=\"" + safeFilename + "\"; filename*=UTF-8''" + encodedFilename)
                    .body(new org.springframework.core.io.FileSystemResource(file));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Download failed: " + e.getMessage(), "DOWNLOAD_FAILED"));
        }
    }

    private String safeDownloadFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "download";
        }
        String sanitized = filename.replaceAll("[\\r\\n\\\"]", "_").replaceAll("[/\\\\]", "_").trim();
        return sanitized.isBlank() ? "download" : sanitized;
    }

    @GetMapping("/{id}/thumbnail")
    public ResponseEntity<?> getThumbnail(@PathVariable String id) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            Image image = imageService.getImageById(id, userId);

            File thumbnailFile = imageService.getThumbnailFile(id, userId);
            if (thumbnailFile != null && thumbnailFile.exists()) {
                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(image.getMimeType()))
                        .body(new org.springframework.core.io.FileSystemResource(thumbnailFile));
            }

            File originalFile = imageService.getImageFile(id, userId);
            if (originalFile == null || !originalFile.exists()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.parseMediaType(image.getMimeType()))
                    .body(new org.springframework.core.io.FileSystemResource(originalFile));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Thumbnail failed: " + e.getMessage(), "THUMBNAIL_FAILED"));
        }
    }



    @GetMapping("/{id}/analysis")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getImageAnalysis(
            @PathVariable String id) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            imageService.getImageById(id, userId);
            Optional<ImageAnalysis> opt = imageAnalysisRepository.findTopByImageIdAndAnalysisTypeOrderByCreatedAtDesc(id, "RAG");
            if (opt.isEmpty()) {
                return ResponseEntity.ok(ApiResponse.success(Map.of(
                    "status", "NONE",
                    "message", "No analysis record found"
                )));
            }

            ImageAnalysis record = opt.get();
            Map<String, Object> result = new HashMap<>();
            result.put("status", record.getStatus());
            result.put("analysisType", record.getAnalysisType());
            result.put("errorMessage", record.getErrorMessage());
            result.put("updatedAt", record.getUpdatedAt());
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            logger.error("Get analysis failed: imageId={}", id, e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Failed to get analysis: " + e.getMessage(), "ANALYSIS_FAILED"));
        }
    }
}
