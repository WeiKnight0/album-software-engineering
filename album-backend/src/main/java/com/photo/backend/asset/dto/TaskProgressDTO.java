package com.photo.backend.asset.dto;

import java.time.LocalDateTime;
import java.util.List;

public class TaskProgressDTO {
    private String taskId;
    private String taskName;
    private Integer status;
    private Integer totalFiles;
    private Long totalSize;
    private Integer uploadedFiles;
    private Long uploadedSize;
    private Integer progress;
    private List<UploadFileDTO> files;
    private LocalDateTime createdAt;

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

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
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

    public Integer getUploadedFiles() {
        return uploadedFiles;
    }

    public void setUploadedFiles(Integer uploadedFiles) {
        this.uploadedFiles = uploadedFiles;
    }

    public Long getUploadedSize() {
        return uploadedSize;
    }

    public void setUploadedSize(Long uploadedSize) {
        this.uploadedSize = uploadedSize;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public List<UploadFileDTO> getFiles() {
        return files;
    }

    public void setFiles(List<UploadFileDTO> files) {
        this.files = files;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
