package com.photo.backend.asset.controller;

import com.photo.backend.asset.dto.*;
import com.photo.backend.asset.service.UploadService;
import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.user.service.CurrentUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class UploadController {
    private static final Logger logger = LoggerFactory.getLogger(UploadController.class);

    @Autowired
    private UploadService uploadService;

    @Autowired
    private CurrentUserService currentUserService;

    @PostMapping("/tasks")
    public ResponseEntity<ApiResponse<UploadTaskDTO>> createTask(@RequestBody CreateTaskRequest request) {
        try {
            request.setUserId(currentUserService.getCurrentUserId());
            if (request.getFiles() == null || request.getFiles().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("参数不完整", "INVALID_REQUEST"));
            }

            UploadTaskDTO task = uploadService.createTask(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(task, "创建上传任务成功"));
        } catch (Exception e) {
            logger.error("创建上传任务失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("创建上传任务失败: " + e.getMessage(), "CREATE_TASK_FAILED"));
        }
    }

    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<List<TaskProgressDTO>>> getAllTasks() {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            List<TaskProgressDTO> tasks = uploadService.getAllTasksByUserId(userId);
            return ResponseEntity.ok(ApiResponse.success(tasks));
        } catch (Exception e) {
            logger.error("获取上传任务列表失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("获取上传任务列表失败: " + e.getMessage(), "GET_TASKS_FAILED"));
        }
    }

    @PostMapping("/files/{taskId}")
    public ResponseEntity<ApiResponse<UploadFileDTO>> uploadFile(
            @PathVariable String taskId,
            @RequestParam(value = "fileIndex", required = false) Integer fileIndex,
            @RequestParam(value = "folderId", required = false) Integer folderId,
            @RequestParam("file") MultipartFile file) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("文件不能为空", "EMPTY_FILE"));
            }

            UploadFileDTO result = uploadService.uploadFile(taskId, userId, file, fileIndex, folderId);
            return ResponseEntity.ok(ApiResponse.success(result, "文件上传成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "INVALID_ARGUMENT"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(e.getMessage(), "INVALID_STATE"));
        } catch (Exception e) {
            logger.error("文件上传失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("文件上传失败: " + e.getMessage(), "UPLOAD_FAILED"));
        }
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<TaskProgressDTO>> getTaskProgress(
            @PathVariable String taskId) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            TaskProgressDTO progress = uploadService.getTaskProgress(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success(progress));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (Exception e) {
            logger.error("获取任务进度失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("获取任务进度失败: " + e.getMessage(), "GET_PROGRESS_FAILED"));
        }
    }

    @PatchMapping("/tasks/{taskId}/pause")
    public ResponseEntity<ApiResponse<Void>> pauseTask(
            @PathVariable String taskId,
            @RequestBody Map<String, Integer> request) {
        try {
            Integer userId = currentUserService.getCurrentUserId();

            uploadService.pauseTask(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success("任务已暂停"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "INVALID_STATE"));
        } catch (Exception e) {
            logger.error("暂停任务失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("暂停任务失败: " + e.getMessage(), "PAUSE_FAILED"));
        }
    }

    @PatchMapping("/tasks/{taskId}/resume")
    public ResponseEntity<ApiResponse<Void>> resumeTask(
            @PathVariable String taskId,
            @RequestBody Map<String, Integer> request) {
        try {
            Integer userId = currentUserService.getCurrentUserId();

            uploadService.resumeTask(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success("任务已继续"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "INVALID_STATE"));
        } catch (Exception e) {
            logger.error("继续任务失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("继续任务失败: " + e.getMessage(), "RESUME_FAILED"));
        }
    }

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<Void>> cancelTask(
            @PathVariable String taskId) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            uploadService.cancelTask(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success("任务已取消"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (Exception e) {
            logger.error("取消任务失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("取消任务失败: " + e.getMessage(), "CANCEL_FAILED"));
        }
    }

    @PostMapping("/tasks/{taskId}/retry")
    public ResponseEntity<ApiResponse<Void>> retryTask(
            @PathVariable String taskId,
            @RequestBody Map<String, Integer> request) {
        try {
            Integer userId = currentUserService.getCurrentUserId();

            uploadService.retryTask(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success("任务重试成功"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "INVALID_STATE"));
        } catch (Exception e) {
            logger.error("重试任务失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("重试任务失败: " + e.getMessage(), "RETRY_FAILED"));
        }
    }

    @DeleteMapping("/tasks/{taskId}/cleanup")
    public ResponseEntity<ApiResponse<Void>> cleanupTempFiles(
            @PathVariable String taskId) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            uploadService.cleanupTempFiles(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success("临时文件已清理"));
        } catch (Exception e) {
            logger.error("清理临时文件失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("清理临时文件失败: " + e.getMessage(), "CLEANUP_FAILED"));
        }
    }
}
