package com.photo.backend.common.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "face_appearances", indexes = {
    @Index(name = "idx_face_appearances_face", columnList = "face_id"),
    @Index(name = "idx_face_appearances_image", columnList = "image_id")
})
public class FaceAppearance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "face_apperance_id", nullable = false)
    private Integer id;

    @Column(name = "image_id", nullable = false, length = 36)
    private String imageId;

    @Column(name = "face_id", nullable = false)
    private Integer faceId;

    @Column(name = "bbox", nullable = false, columnDefinition = "TEXT")
    private String bbox;

    @Column(name = "distance")
    private Double distance;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getImageId() {
        return imageId;
    }

    public void setImageId(String imageId) {
        this.imageId = imageId;
    }

    public Integer getFaceId() {
        return faceId;
    }

    public void setFaceId(Integer faceId) {
        this.faceId = faceId;
    }

    public String getBbox() {
        return bbox;
    }

    public void setBbox(String bbox) {
        this.bbox = bbox;
    }

    public Double getDistance() {
        return distance;
    }

    public void setDistance(Double distance) {
        this.distance = distance;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

