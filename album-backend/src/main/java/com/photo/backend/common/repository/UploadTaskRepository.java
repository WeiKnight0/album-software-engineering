package com.photo.backend.common.repository;

import com.photo.backend.common.entity.UploadTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UploadTaskRepository extends JpaRepository<UploadTask, String> {
    Optional<UploadTask> findByIdAndUserId(String id, Integer userId);
    List<UploadTask> findByUserId(Integer userId);
    List<UploadTask> findByUserIdAndStatus(Integer userId, Integer status);
    void deleteByIdAndUserId(String id, Integer userId);
}
