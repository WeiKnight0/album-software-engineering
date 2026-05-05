package com.photo.backend.common.repository;

import com.photo.backend.common.entity.ImageAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ImageAnalysisRepository extends JpaRepository<ImageAnalysis, Integer> {

    Optional<ImageAnalysis> findTopByImageIdAndAnalysisTypeOrderByCreatedAtDesc(String imageId, String analysisType);

    List<ImageAnalysis> findByUserIdAndStatus(Integer userId, String status);

    List<ImageAnalysis> findByUserId(Integer userId);

    List<ImageAnalysis> findByStatus(String status);
}
