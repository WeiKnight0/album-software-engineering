package com.photo.backend.common.repository;

import com.photo.backend.common.entity.UploadFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UploadFileRepository extends JpaRepository<UploadFile, Long> {
    List<UploadFile> findByTaskId(String taskId);
    Optional<UploadFile> findByTaskIdAndFileIndex(String taskId, Integer fileIndex);
    Optional<UploadFile> findByTaskIdAndFileName(String taskId, String fileName);

    @Query("SELECT COUNT(u) FROM UploadFile u WHERE u.taskId = :taskId AND u.status = :status")
    long countByTaskIdAndStatus(@Param("taskId") String taskId, @Param("status") Integer status);

    void deleteByTaskId(String taskId);
}
