package com.photo.backend.common.repository;

import com.photo.backend.common.entity.FaceAppearance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface FaceAppearanceRepository extends JpaRepository<FaceAppearance, Integer> {
    List<FaceAppearance> findByFaceId(Integer faceId);
    List<FaceAppearance> findByFaceIdOrderByCreatedAtDesc(Integer faceId);
    List<FaceAppearance> findByImageId(String imageId);
    long countByFaceId(Integer faceId);

    @Modifying
    @Query("update FaceAppearance fa set fa.faceId = :targetFaceId where fa.faceId in :sourceFaceIds")
    int rebindFaceIds(@Param("sourceFaceIds") List<Integer> sourceFaceIds, @Param("targetFaceId") Integer targetFaceId);

    void deleteByFaceId(Integer faceId);
}
