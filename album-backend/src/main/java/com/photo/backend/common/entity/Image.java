package com.photo.backend.common.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Image", indexes = {
    @Index(name = "idx_user", columnList = "user_id"),
    @Index(name = "idx_user_folder", columnList = "user_id, folder_id"),
    @Index(name = "idx_image_user_recycle", columnList = "user_id, is_in_recycle_bin"),
    @Index(name = "idx_upload", columnList = "user_id, upload_time")
})
public class Image {
    @Id
    @Column(name = "image_id", nullable = false, length = 36)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "folder_id")
    private Integer folderId;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false, length = 255)
    private String storedFilename;

    @Column(name = "thumbnail_filename", length = 255)
    private String thumbnailFilename;

    @Column(name = "file_size", nullable = false)
    private Integer fileSize;

    @Column(name = "mime_type", length = 50, columnDefinition = "VARCHAR(50) DEFAULT 'image/jpeg'")
    private String mimeType = "image/jpeg";

    @Column(name = "upload_time", columnDefinition = "DATETIME DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime uploadTime;

    @Column(name = "is_in_recycle_bin", columnDefinition = "TINYINT DEFAULT 0")
    private Boolean isInRecycleBin = false;

    @Column(name = "moved_to_bin_at")
    private LocalDateTime movedToBinAt;

    @Column(name = "original_folder_id")
    private Integer originalFolderId;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Integer getFolderId() {
        return folderId;
    }

    public void setFolderId(Integer folderId) {
        this.folderId = folderId;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getStoredFilename() {
        return storedFilename;
    }

    public void setStoredFilename(String storedFilename) {
        this.storedFilename = storedFilename;
    }

    public String getThumbnailFilename() {
        return thumbnailFilename;
    }

    public void setThumbnailFilename(String thumbnailFilename) {
        this.thumbnailFilename = thumbnailFilename;
    }

    public Integer getFileSize() {
        return fileSize;
    }

    public void setFileSize(Integer fileSize) {
        this.fileSize = fileSize;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public LocalDateTime getUploadTime() {
        return uploadTime;
    }

    public void setUploadTime(LocalDateTime uploadTime) {
        this.uploadTime = uploadTime;
    }

    public Boolean getIsInRecycleBin() {
        return isInRecycleBin;
    }

    public void setIsInRecycleBin(Boolean isInRecycleBin) {
        this.isInRecycleBin = isInRecycleBin;
    }

    public LocalDateTime getMovedToBinAt() {
        return movedToBinAt;
    }

    public void setMovedToBinAt(LocalDateTime movedToBinAt) {
        this.movedToBinAt = movedToBinAt;
    }

    public Integer getOriginalFolderId() {
        return originalFolderId;
    }

    public void setOriginalFolderId(Integer originalFolderId) {
        this.originalFolderId = originalFolderId;
    }
}
