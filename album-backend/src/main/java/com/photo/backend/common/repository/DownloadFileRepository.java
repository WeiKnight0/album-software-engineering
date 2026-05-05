package com.photo.backend.common.repository;

import com.photo.backend.common.entity.DownloadFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DownloadFileRepository extends JpaRepository<DownloadFile, Long> {
    List<DownloadFile> findByTaskId(String taskId);
    Optional<DownloadFile> findByTaskIdAndFileIndex(String taskId, Integer fileIndex);
    Optional<DownloadFile> findByTaskIdAndImageId(String taskId, String imageId);

    @Query("SELECT COUNT(d) FROM DownloadFile d WHERE d.taskId = :taskId AND d.status = :status")
    long countByTaskIdAndStatus(@Param("taskId") String taskId, @Param("status") Integer status);

    void deleteByTaskId(String taskId);
}
