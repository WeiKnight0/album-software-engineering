package com.photo.backend.face.service;

public class FaceServiceException extends RuntimeException {
    public FaceServiceException(String message) {
        super(message);
    }

    public FaceServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}

