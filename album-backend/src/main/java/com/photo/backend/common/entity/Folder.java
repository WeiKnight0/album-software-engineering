package com.photo.backend.common.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Folder",
    indexes = {
        @Index(name = "idx_user_parent", columnList = "user_id, parent_id"),
        @Index(name = "idx_user_name", columnList = "user_id, name"),
        @Index(name = "idx_folder_user_recycle", columnList = "user_id, is_in_recycle_bin")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_parent_name", columnNames = {"user_id", "parent_id", "name"})
    }
)
public class Folder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "folder_id", nullable = false)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "parent_id")
    private Integer parentId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "cover_image_id", length = 36)
    private String coverImageId;

    @Column(name = "is_in_recycle_bin", nullable = false, columnDefinition = "TINYINT NOT NULL DEFAULT 0")
    private Boolean isInRecycleBin = false;

    @Column(name = "moved_to_bin_at")
    private LocalDateTime movedToBinAt;

    @Column(name = "original_parent_id")
    private Integer originalParentId;

    @Column(name = "created_at", nullable = false, columnDefinition = "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, columnDefinition = "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime updatedAt;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public Integer getParentId() {
        return parentId;
    }

    public void setParentId(Integer parentId) {
        this.parentId = parentId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCoverImageId() {
        return coverImageId;
    }

    public void setCoverImageId(String coverImageId) {
        this.coverImageId = coverImageId;
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

    public Integer getOriginalParentId() {
        return originalParentId;
    }

    public void setOriginalParentId(Integer originalParentId) {
        this.originalParentId = originalParentId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
