package com.photo.backend.common.repository;

import com.photo.backend.common.entity.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ImageRepository extends JpaRepository<Image, String> {
    List<Image> findByUserIdAndFolderId(Integer userId, Integer folderId);
    List<Image> findByUserIdAndIsInRecycleBin(Integer userId, Boolean isInRecycleBin);
    List<Image> findByUserIdAndIsInRecycleBinFalseOrderByUploadTimeDesc(Integer userId);
    Optional<Image> findByIdAndUserId(String id, Integer userId);
    long countByUserId(Integer userId);
    @Query("SELECT SUM(i.fileSize) FROM Image i WHERE i.userId = :userId")
    Long getTotalFileSizeByUserId(@Param("userId") Integer userId);
}
