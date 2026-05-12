package com.photo.backend.face.service;

import com.photo.backend.common.entity.ImageAnalysis;
import com.photo.backend.common.repository.ImageAnalysisRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class FaceAnalysisService {
    private static final Logger logger = LoggerFactory.getLogger(FaceAnalysisService.class);
    private static final String USER_FACING_ERROR = "人脸识别服务暂时不可用，请稍后重试";

    @Autowired
    private ImageAnalysisRepository imageAnalysisRepository;

    @Autowired
    private FaceService faceService;

    @Async
    public void runFaceRecognitionAsync(Integer userId, String imageId, String imagePath) {
        long t0 = System.currentTimeMillis();
        logger.info("[Async] ===== START face recognition for imageId={}, userId={}, path={} =====", imageId, userId, imagePath);

        ImageAnalysis record = imageAnalysisRepository
                .findTopByImageIdAndAnalysisTypeOrderByCreatedAtDesc(imageId, "FACE")
                .orElse(null);
        if (record == null) {
            logger.error("[Async] No FACE analysis record found for imageId={}, cannot proceed", imageId);
            return;
        }

        record.setStatus("PROCESSING");
        record.setErrorMessage(null);
        imageAnalysisRepository.save(record);

        try {
            byte[] fileBytes = Files.readAllBytes(Path.of(imagePath));
            int faceCount = faceService.onImageUploaded(userId, imageId, fileBytes);
            record.setStatus("SUCCESS");
            record.setErrorMessage(null);
            logger.info("[Async] ===== SUCCESS face recognition for imageId={}, faces={}, totalTime={}ms =====",
                    imageId, faceCount, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            record.setStatus("FAILED");
            record.setErrorMessage(USER_FACING_ERROR);
            logger.error("[Async] ===== FAILED face recognition for imageId={}, totalTime={}ms, exception={} =====",
                    imageId, System.currentTimeMillis() - t0, e.getMessage(), e);
        }

        imageAnalysisRepository.save(record);
    }
}
