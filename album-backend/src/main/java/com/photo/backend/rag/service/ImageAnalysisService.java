package com.photo.backend.rag.service;

import com.photo.backend.common.entity.ImageAnalysis;
import com.photo.backend.common.repository.ImageAnalysisRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ImageAnalysisService {
    private static final Logger logger = LoggerFactory.getLogger(ImageAnalysisService.class);

    @Autowired
    private ImageAnalysisRepository imageAnalysisRepository;

    @Autowired
    private RagService ragService;

    public ImageAnalysis createPendingRecord(Integer userId, String imageId, String analysisType) {
        Optional<ImageAnalysis> existing = imageAnalysisRepository
                .findTopByImageIdAndAnalysisTypeOrderByCreatedAtDesc(imageId, analysisType);
        if (existing.isPresent()) {
            logger.info("Analysis record already exists for imageId={}, reusing existing", imageId);
            return existing.get();
        }

        ImageAnalysis record = new ImageAnalysis();
        record.setUserId(userId);
        record.setImageId(imageId);
        record.setAnalysisType(analysisType);
        record.setStatus("PENDING");
        return imageAnalysisRepository.save(record);
    }

    @Async
    public void runVectorIndexAsync(Integer userId, String imageId, String imagePath) {
        long t0 = System.currentTimeMillis();
        logger.info("[Async] ===== START vector index for imageId={}, userId={}, path={} =====", imageId, userId, imagePath);

        // 等待 Spring 事务提交后再查询记录。
        // uploadImage 在 @Transactional 事务中调用本方法，如果异步线程启动过快，
        // 事务可能尚未提交，导致查询不到刚创建的 PENDING 记录。
        ImageAnalysis record = null;
        for (int attempt = 0; attempt < 5; attempt++) {
            record = imageAnalysisRepository.findTopByImageIdAndAnalysisTypeOrderByCreatedAtDesc(imageId, "RAG").orElse(null);
            if (record != null) {
                break;
            }
            logger.warn("[Async] Analysis record not found for imageId={}, retrying in 1s (attempt {}/5)", imageId, attempt + 1);
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.error("[Async] Interrupted while waiting for analysis record, imageId={}", imageId);
                return;
            }
        }

        if (record == null) {
            logger.error("[Async] No analysis record found for imageId={}, cannot proceed", imageId);
            return;
        }

        record.setStatus("PROCESSING");
        imageAnalysisRepository.save(record);
        logger.info("[Async] Status set to PROCESSING for imageId={} (took {}ms)", imageId, System.currentTimeMillis() - t0);

        try {
            long t1 = System.currentTimeMillis();
            boolean success = ragService.analyzeAndIndexImage(userId, imageId, imagePath);
            long httpMs = System.currentTimeMillis() - t1;

            if (success) {
                record.setStatus("SUCCESS");
                logger.info("[Async] ===== SUCCESS vector index for imageId={}, totalTime={}ms, httpTime={}ms =====", imageId, System.currentTimeMillis() - t0, httpMs);
            } else {
                record.setStatus("FAILED");
                record.setErrorMessage("RAG index returned failure");
                logger.warn("[Async] ===== FAILED vector index for imageId={}, totalTime={}ms, httpTime={}ms, reason=RAG returned failure =====", imageId, System.currentTimeMillis() - t0, httpMs);
            }
        } catch (Exception e) {
            record.setStatus("FAILED");
            String errMsg = e.getMessage();
            record.setErrorMessage(errMsg);
            logger.error("[Async] ===== FAILED vector index for imageId={}, totalTime={}ms, exception={} =====", imageId, System.currentTimeMillis() - t0, errMsg, e);
        }

        imageAnalysisRepository.save(record);
    }

    public void deleteByImageId(String imageId) {
        var opt = imageAnalysisRepository.findTopByImageIdAndAnalysisTypeOrderByCreatedAtDesc(imageId, "RAG");
        opt.ifPresent(record -> {
            imageAnalysisRepository.delete(record);
            logger.info("Deleted analysis record for imageId={}", imageId);
        });
    }
}
