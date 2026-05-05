package com.photo.backend.common.repository;

import com.photo.backend.common.entity.Face;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FaceRepository extends JpaRepository<Face, Integer> {
    List<Face> findByUserIdOrderByLastSeenAtDesc(Integer userId);
    List<Face> findByUserId(Integer userId);
    Optional<Face> findByIdAndUserId(Integer id, Integer userId);
    boolean existsByIdAndUserId(Integer id, Integer userId);
    List<Face> findByUserIdAndFaceNameOrderByIdAsc(Integer userId, String faceName);
}
