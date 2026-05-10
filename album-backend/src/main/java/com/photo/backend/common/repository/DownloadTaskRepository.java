package com.photo.backend.common.repository;

import com.photo.backend.common.entity.DownloadTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DownloadTaskRepository extends JpaRepository<DownloadTask, String>, JpaSpecificationExecutor<DownloadTask> {
    Optional<DownloadTask> findByIdAndUserId(String id, Integer userId);
    List<DownloadTask> findByUserId(Integer userId);
    List<DownloadTask> findByUserIdAndStatus(Integer userId, Integer status);
    void deleteByIdAndUserId(String id, Integer userId);
}
