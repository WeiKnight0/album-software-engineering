package com.photo.backend.rag.dto;

import java.util.List;

public class ChatResponse {
    private String answer;
    private List<ChatReference> references;

    public ChatResponse() {
    }

    public ChatResponse(String answer, List<ChatReference> references) {
        this.answer = answer;
        this.references = references;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public List<ChatReference> getReferences() {
        return references;
    }

    public void setReferences(List<ChatReference> references) {
        this.references = references;
    }

    public static class ChatReference {
        private String imageId;
        private String description;
        private String thumbnailUrl;

        public ChatReference() {
        }

        public ChatReference(String imageId, String description, String thumbnailUrl) {
            this.imageId = imageId;
            this.description = description;
            this.thumbnailUrl = thumbnailUrl;
        }

        public String getImageId() {
            return imageId;
        }

        public void setImageId(String imageId) {
            this.imageId = imageId;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public String getThumbnailUrl() {
            return thumbnailUrl;
        }

        public void setThumbnailUrl(String thumbnailUrl) {
            this.thumbnailUrl = thumbnailUrl;
        }
    }
}
