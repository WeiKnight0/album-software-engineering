package com.photo.backend.asset.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.asset.dto.CreateDownloadTaskRequest;
import com.photo.backend.asset.dto.DownloadFileDTO;
import com.photo.backend.asset.dto.DownloadTaskDTO;
import com.photo.backend.asset.service.DownloadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import com.photo.backend.user.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/downloads")
public class DownloadController {
    private static final Logger logger = LoggerFactory.getLogger(DownloadController.class);

    @Autowired
    private DownloadService downloadService;

    @Autowired
    private CurrentUserService currentUserService;

    @PostMapping("/tasks")
    public ResponseEntity<ApiResponse<DownloadTaskDTO>> createTask(@RequestBody CreateDownloadTaskRequest request) {
        try {
            request.setUserId(currentUserService.getCurrentUserId());
            DownloadTaskDTO task = downloadService.createTask(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(task, "创建下载任务成功"));
        } catch (Exception e) {
            logger.error("创建下载任务失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("创建下载任务失败: " + e.getMessage(), "CREATE_TASK_FAILED"));
        }
    }

    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<List<DownloadTaskDTO>>> getTasks() {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            List<DownloadTaskDTO> tasks = downloadService.getTasks(userId);
            return ResponseEntity.ok(ApiResponse.success(tasks));
        } catch (Exception e) {
            logger.error("获取下载任务列表失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("获取下载任务列表失败: " + e.getMessage(), "GET_TASKS_FAILED"));
        }
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<DownloadTaskDTO>> getTask(
            @PathVariable String taskId) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            DownloadTaskDTO task = downloadService.getTask(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success(task));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (Exception e) {
            logger.error("获取任务详情失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("获取任务详情失败: " + e.getMessage(), "GET_TASK_FAILED"));
        }
    }

    @GetMapping("/tasks/{taskId}/files")
    public ResponseEntity<ApiResponse<List<DownloadFileDTO>>> getTaskFiles(
            @PathVariable String taskId) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            List<DownloadFileDTO> files = downloadService.getTaskFiles(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success(files));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (Exception e) {
            logger.error("获取任务文件列表失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("获取任务文件列表失败: " + e.getMessage(), "GET_FILES_FAILED"));
        }
    }

    @PatchMapping("/tasks/{taskId}/pause")
    public ResponseEntity<ApiResponse<Void>> pauseTask(
            @PathVariable String taskId,
            @RequestBody Map<String, Integer> request) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            downloadService.pauseTask(taskId, userId);
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
            downloadService.resumeTask(taskId, userId);
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

    @PatchMapping("/tasks/{taskId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelTask(
            @PathVariable String taskId,
            @RequestBody Map<String, Integer> request) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            downloadService.cancelTask(taskId, userId);
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

    @PatchMapping("/tasks/{taskId}/retry")
    public ResponseEntity<ApiResponse<Void>> retryTask(
            @PathVariable String taskId,
            @RequestBody Map<String, Integer> request) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            downloadService.retryTask(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success("任务已重试"));
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

    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @PathVariable String taskId) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            downloadService.deleteTask(taskId, userId);
            return ResponseEntity.ok(ApiResponse.success("任务已删除"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (Exception e) {
            logger.error("删除任务失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("删除任务失败: " + e.getMessage(), "DELETE_FAILED"));
        }
    }

    @PatchMapping("/tasks/{taskId}/files/{imageId}/complete")
    public ResponseEntity<ApiResponse<Void>> markFileCompleted(
            @PathVariable String taskId,
            @PathVariable String imageId) {
        try {
            Integer userId = currentUserService.getCurrentUserId();
            downloadService.markFileCompleted(taskId, userId, imageId);
            return ResponseEntity.ok(ApiResponse.success("文件已标记完成"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound()
                .build();
        } catch (Exception e) {
            logger.error("标记文件完成失败: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("标记文件完成失败: " + e.getMessage(), "MARK_COMPLETE_FAILED"));
        }
    }
}
