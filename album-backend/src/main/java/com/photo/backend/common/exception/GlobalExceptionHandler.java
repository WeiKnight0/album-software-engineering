package com.photo.backend.common.exception;

import com.photo.backend.common.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), e.getErrorCode()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage() == null ? "参数校验失败" : error.getDefaultMessage())
                .orElse("参数校验失败");
        return ResponseEntity.badRequest().body(ApiResponse.error(message, "VALIDATION_FAILED"));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleSecurityException(SecurityException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(e.getMessage(), "FORBIDDEN"));
    }
}
