package com.photo.backend.asset.dto;

public class UploadFileDTO {
    private Long id;
    private Integer fileIndex;
    private String fileName;
    private Long fileSize;
    private Integer status;
    private Integer progress;
    private Long uploadedSize;
    private String imageId;
    private String errorMsg;
    private Integer currentChunk;
    private Integer totalChunks;
    private String tempPath;
    private String finalPath;
    private String analysisStatus;
    private String analysisErrorMessage;
    private String ragAnalysisStatus;
    private String ragAnalysisErrorMessage;
    private String faceAnalysisStatus;
    private String faceAnalysisErrorMessage;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getFileIndex() {
        return fileIndex;
    }

    public void setFileIndex(Integer fileIndex) {
        this.fileIndex = fileIndex;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public Integer getProgress() {
        return progress;
    }

    public void setProgress(Integer progress) {
        this.progress = progress;
    }

    public Long getUploadedSize() {
        return uploadedSize;
    }

    public void setUploadedSize(Long uploadedSize) {
        this.uploadedSize = uploadedSize;
    }

    public String getImageId() {
        return imageId;
    }

    public void setImageId(String imageId) {
        this.imageId = imageId;
    }

    public String getErrorMsg() {
        return errorMsg;
    }

    public void setErrorMsg(String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public Integer getCurrentChunk() {
        return currentChunk;
    }

    public void setCurrentChunk(Integer currentChunk) {
        this.currentChunk = currentChunk;
    }

    public Integer getTotalChunks() {
        return totalChunks;
    }

    public void setTotalChunks(Integer totalChunks) {
        this.totalChunks = totalChunks;
    }

    public String getTempPath() {
        return tempPath;
    }

    public void setTempPath(String tempPath) {
        this.tempPath = tempPath;
    }

    public String getFinalPath() {
        return finalPath;
    }

    public void setFinalPath(String finalPath) {
        this.finalPath = finalPath;
    }

    public String getAnalysisStatus() {
        return analysisStatus;
    }

    public void setAnalysisStatus(String analysisStatus) {
        this.analysisStatus = analysisStatus;
    }

    public String getAnalysisErrorMessage() {
        return analysisErrorMessage;
    }

    public void setAnalysisErrorMessage(String analysisErrorMessage) {
        this.analysisErrorMessage = analysisErrorMessage;
    }

    public String getRagAnalysisStatus() {
        return ragAnalysisStatus;
    }

    public void setRagAnalysisStatus(String ragAnalysisStatus) {
        this.ragAnalysisStatus = ragAnalysisStatus;
    }

    public String getRagAnalysisErrorMessage() {
        return ragAnalysisErrorMessage;
    }

    public void setRagAnalysisErrorMessage(String ragAnalysisErrorMessage) {
        this.ragAnalysisErrorMessage = ragAnalysisErrorMessage;
    }

    public String getFaceAnalysisStatus() {
        return faceAnalysisStatus;
    }

    public void setFaceAnalysisStatus(String faceAnalysisStatus) {
        this.faceAnalysisStatus = faceAnalysisStatus;
    }

    public String getFaceAnalysisErrorMessage() {
        return faceAnalysisErrorMessage;
    }

    public void setFaceAnalysisErrorMessage(String faceAnalysisErrorMessage) {
        this.faceAnalysisErrorMessage = faceAnalysisErrorMessage;
    }
}
