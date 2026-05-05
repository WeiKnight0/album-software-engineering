package com.photo.backend.asset.dto;

import java.time.LocalDateTime;
import java.util.List;

public class DownloadTaskDTO {
    private String taskId;
    private String taskName;
    private Integer userId;
    private Integer totalFiles;
    private Long totalSize;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private Integer downloadedFiles;
    private Long downloadedSize;
    private Integer progress;
    private List<DownloadFileDTO> files;

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Integer getTotalFiles() {
        return totalFiles;
    }

    public void setTotalFiles(Integer totalFiles) {
        this.totalFiles = totalFiles;
    }

    public Long getTotalSize() {
        return totalSize;
    }

    public void setTotalSize(Long totalSize) {
        this.totalSize = totalSize;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public Integer getDownloadedFiles() {
        return downloadedFiles;
    }

    public void setDownloadedFiles(Integer downloadedFiles) {
        this.downloadedFiles = downloadedFiles;
    }

    public Long getDownloadedSize() {
        return downloadedSize;
    }

    public void setDownloadedSize(Long downloadedSize) {
        this.downloadedSize = downloadedSize;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public List<DownloadFileDTO> getFiles() {
        return files;
    }

    public void setFiles(List<DownloadFileDTO> files) {
        this.files = files;
    }
}
