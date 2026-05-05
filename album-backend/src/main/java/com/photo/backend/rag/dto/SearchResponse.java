package com.photo.backend.rag.dto;

import com.photo.backend.common.entity.Image;

import java.util.List;

public class SearchResponse {
    private List<Image> images;
    private String message;

    public SearchResponse() {
    }

    public SearchResponse(List<Image> images, String message) {
        this.images = images;
        this.message = message;
    }

    public List<Image> getImages() {
        return images;
    }

    public void setImages(List<Image> images) {
        this.images = images;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
