package com.photo.backend.asset.service;

import com.photo.backend.asset.util.UploadFileUtil;
import com.photo.backend.common.entity.ImageAnalysis;
import com.photo.backend.common.entity.UploadFile;
import com.photo.backend.common.entity.UploadTask;
import com.photo.backend.common.repository.ImageAnalysisRepository;
import com.photo.backend.common.repository.UploadFileRepository;
import com.photo.backend.common.repository.UploadTaskRepository;
import com.photo.backend.asset.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UploadService {
    private static final Logger logger = LoggerFactory.getLogger(UploadService.class);

    public static final int TASK_STATUS_WAITING = 1;
    public static final int TASK_STATUS_UPLOADING = 2;
    public static final int TASK_STATUS_COMPLETED = 3;
    public static final int TASK_STATUS_CANCELLED = 4;
    public static final int TASK_STATUS_PAUSED = 5;

    public static final int FILE_STATUS_WAITING = 1;
    public static final int FILE_STATUS_UPLOADING = 2;
    public static final int FILE_STATUS_SUCCESS = 3;
    public static final int FILE_STATUS_FAILED = 4;
    public static final int FILE_STATUS_PAUSED = 5;

    @Autowired
    private UploadTaskRepository uploadTaskRepository;

    @Autowired
    private UploadFileRepository uploadFileRepository;

    @Autowired
    private UploadFileUtil uploadFileUtil;

    @Autowired
    private com.photo.backend.asset.service.ImageService imageService;

    @Autowired
    private ImageAnalysisRepository imageAnalysisRepository;

    @Transactional
    public UploadTaskDTO createTask(CreateTaskRequest request) {
        String taskId = UUID.randomUUID().toString();

        UploadTask task = new UploadTask();
        task.setId(taskId);
        task.setUserId(request.getUserId());
        task.setTaskName(request.getTaskName());
        task.setTotalFiles(request.getFiles().size());
        task.setTotalSize(request.getFiles().stream()
                .mapToLong(f -> f.getFileSize() != null ? f.getFileSize() : 0)
                .sum());
        task.setUploadedFiles(0);
        task.setUploadedSize(0L);
        task.setStatus(TASK_STATUS_WAITING);
        task.setCreatedAt(LocalDateTime.now());

        uploadTaskRepository.save(task);

        for (int i = 0; i < request.getFiles().size(); i++) {
            CreateTaskRequest.FileInfo fileInfo = request.getFiles().get(i);
            UploadFile uploadFile = new UploadFile();
            uploadFile.setTaskId(taskId);
            uploadFile.setUserId(request.getUserId());
            uploadFile.setFileName(fileInfo.getFileName());
            uploadFile.setFileSize(fileInfo.getFileSize() != null ? fileInfo.getFileSize() : 0L);
            uploadFile.setFileIndex(i);
            uploadFile.setFileType(fileInfo.getFileType());
            uploadFile.setStatus(FILE_STATUS_WAITING);
            uploadFile.setProgress(0);
            uploadFile.setCreatedAt(LocalDateTime.now());
            uploadFile.setUpdatedAt(LocalDateTime.now());

            uploadFileRepository.save(uploadFile);
        }

        return getTaskDTO(task);
    }

    @Transactional
    public UploadFileDTO uploadFile(String taskId, Integer userId, MultipartFile file, Integer fileIndex, Integer folderId) throws IOException {
        UploadTask task = uploadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        if (task.getStatus() == TASK_STATUS_CANCELLED) {
            throw new IllegalStateException("任务已取消");
        }

        if (task.getStatus() == TASK_STATUS_PAUSED) {
            throw new IllegalStateException("任务已暂停");
        }

        if (task.getStatus() == TASK_STATUS_WAITING) {
            task.setStatus(TASK_STATUS_UPLOADING);
            uploadTaskRepository.save(task);
        }

        UploadFile uploadFile;
        if (fileIndex != null) {
            uploadFile = uploadFileRepository.findByTaskIdAndFileIndex(taskId, fileIndex)
                    .orElse(null);
        } else {
            uploadFile = uploadFileRepository.findByTaskId(taskId).stream().findFirst().orElse(null);
        }

        if (uploadFile == null) {
            throw new IllegalArgumentException("文件记录不存在");
        }

        uploadFile.setStatus(FILE_STATUS_UPLOADING);
        uploadFile.setProgress(50);

        try {
            com.photo.backend.common.entity.Image image = imageService.uploadImage(file, userId, folderId);
            uploadFile.setImageId(image.getId());
            uploadFile.setStatus(FILE_STATUS_SUCCESS);
            uploadFile.setProgress(100);
            uploadFile.setCompletedAt(LocalDateTime.now());
        } catch (Exception e) {
            logger.error("Failed to save image: {}", e.getMessage());
            uploadFile.setErrorMsg(e.getMessage());
            uploadFile.setStatus(FILE_STATUS_FAILED);
        }

        uploadFile.setUpdatedAt(LocalDateTime.now());
        uploadFileRepository.save(uploadFile);

        updateTaskProgress(taskId, userId);

        UploadFileDTO dto = new UploadFileDTO();
        dto.setFileIndex(uploadFile.getFileIndex());
        dto.setProgress(uploadFile.getProgress());
        dto.setImageId(uploadFile.getImageId());
        return dto;
    }

    @Transactional
    public void recordSimpleUpload(String imageId, Integer userId, String fileName, Long fileSize) {
        String taskId = UUID.randomUUID().toString();

        UploadTask task = new UploadTask();
        task.setId(taskId);
        task.setUserId(userId);
        task.setTaskName(fileName);
        task.setTotalFiles(1);
        task.setTotalSize(fileSize);
        task.setUploadedFiles(1);
        task.setUploadedSize(fileSize);
        task.setStatus(TASK_STATUS_COMPLETED);
        task.setCreatedAt(LocalDateTime.now());
        task.setCompletedAt(LocalDateTime.now());
        uploadTaskRepository.save(task);

        UploadFile uploadFile = new UploadFile();
        uploadFile.setTaskId(taskId);
        uploadFile.setUserId(userId);
        uploadFile.setFileName(fileName);
        uploadFile.setFileSize(fileSize);
        uploadFile.setFileIndex(0);
        uploadFile.setStatus(FILE_STATUS_SUCCESS);
        uploadFile.setProgress(100);
        uploadFile.setImageId(imageId);
        uploadFile.setCompletedAt(LocalDateTime.now());
        uploadFile.setCreatedAt(LocalDateTime.now());
        uploadFile.setUpdatedAt(LocalDateTime.now());
        uploadFileRepository.save(uploadFile);
    }

    public List<TaskProgressDTO> getAllTasksByUserId(Integer userId) {
        List<UploadTask> tasks = uploadTaskRepository.findByUserId(userId);
        return tasks.stream().map(task -> getTaskProgress(task.getId(), userId)).toList();
    }

    @Transactional
    public void completeFile(String taskId, Integer userId, Integer fileIndex, String imageId) {
        UploadFile uploadFile = uploadFileRepository.findByTaskIdAndFileIndex(taskId, fileIndex)
                .orElseThrow(() -> new IllegalArgumentException("文件记录不存在"));

        uploadFile.setStatus(FILE_STATUS_SUCCESS);
        uploadFile.setProgress(100);
        uploadFile.setImageId(imageId);
        uploadFile.setCompletedAt(LocalDateTime.now());
        uploadFile.setUpdatedAt(LocalDateTime.now());
        uploadFileRepository.save(uploadFile);

        updateTaskProgress(taskId, userId);
    }

    public TaskProgressDTO getTaskProgress(String taskId, Integer userId) {
        UploadTask task = uploadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        List<UploadFile> files = uploadFileRepository.findByTaskId(taskId);

        TaskProgressDTO dto = new TaskProgressDTO();
        dto.setTaskId(task.getId());
        dto.setTaskName(task.getTaskName());
        dto.setStatus(task.getStatus());
        dto.setTotalFiles(task.getTotalFiles());
        dto.setTotalSize(task.getTotalSize());
        dto.setUploadedFiles(task.getUploadedFiles());
        dto.setUploadedSize(task.getUploadedSize());

        int overallProgress = task.getTotalSize() > 0
                ? (int) ((task.getUploadedSize() * 100) / task.getTotalSize())
                : 0;
        dto.setProgress(overallProgress);

        List<UploadFileDTO> fileDTOs = files.stream().map(this::convertToDTO).toList();
        dto.setFiles(fileDTOs);

        return dto;
    }

    @Transactional
    public void pauseTask(String taskId, Integer userId) {
        UploadTask task = uploadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        if (task.getStatus() != TASK_STATUS_UPLOADING && task.getStatus() != TASK_STATUS_WAITING) {
            throw new IllegalStateException("任务无法暂停");
        }

        task.setStatus(TASK_STATUS_PAUSED);
        task.setUpdatedAt(LocalDateTime.now());
        uploadTaskRepository.save(task);

        List<UploadFile> files = uploadFileRepository.findByTaskId(taskId);
        for (UploadFile file : files) {
            if (file.getStatus() == FILE_STATUS_UPLOADING || file.getStatus() == FILE_STATUS_WAITING) {
                file.setStatus(FILE_STATUS_PAUSED);
                file.setUpdatedAt(LocalDateTime.now());
                uploadFileRepository.save(file);
            }
        }
    }

    @Transactional
    public void resumeTask(String taskId, Integer userId) {
        UploadTask task = uploadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        if (task.getStatus() != TASK_STATUS_PAUSED) {
            throw new IllegalStateException("任务不在暂停状态");
        }

        task.setStatus(TASK_STATUS_WAITING);
        task.setUpdatedAt(LocalDateTime.now());
        uploadTaskRepository.save(task);

        List<UploadFile> files = uploadFileRepository.findByTaskId(taskId);
        for (UploadFile file : files) {
            if (file.getStatus() == FILE_STATUS_PAUSED) {
                file.setStatus(FILE_STATUS_WAITING);
                file.setUpdatedAt(LocalDateTime.now());
                uploadFileRepository.save(file);
            }
        }
    }

    @Transactional
    public void cancelTask(String taskId, Integer userId) {
        UploadTask task = uploadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        task.setStatus(TASK_STATUS_CANCELLED);
        task.setUpdatedAt(LocalDateTime.now());
        uploadTaskRepository.save(task);

        uploadFileUtil.deleteTempDirectory(taskId);
    }

    @Transactional
    public void retryTask(String taskId, Integer userId) {
        UploadTask task = uploadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        if (task.getStatus() != TASK_STATUS_CANCELLED && task.getStatus() != TASK_STATUS_PAUSED) {
            throw new IllegalStateException("任务无法重试");
        }

        List<UploadFile> files = uploadFileRepository.findByTaskId(taskId);
        for (UploadFile file : files) {
            if (file.getStatus() == FILE_STATUS_FAILED) {
                file.setStatus(FILE_STATUS_WAITING);
                file.setProgress(0);
                file.setErrorMsg(null);
                file.setUpdatedAt(LocalDateTime.now());
                uploadFileRepository.save(file);
            }
        }

        task.setStatus(TASK_STATUS_WAITING);
        task.setUpdatedAt(LocalDateTime.now());
        uploadTaskRepository.save(task);
    }

    @Transactional
    public void cleanupTempFiles(String taskId, Integer userId) {
        uploadFileUtil.deleteTempDirectory(taskId);
    }

    private void updateTaskProgress(String taskId, Integer userId) {
        UploadTask task = uploadTaskRepository.findByIdAndUserId(taskId, userId).orElse(null);
        if (task == null) return;

        List<UploadFile> files = uploadFileRepository.findByTaskId(taskId);

        long successCount = files.stream().filter(f -> f.getStatus() == FILE_STATUS_SUCCESS).count();
        long uploadedSize = files.stream().mapToLong(f -> f.getFileSize() != null ? f.getFileSize() : 0).sum();

        task.setUploadedFiles((int) successCount);
        task.setUploadedSize(uploadedSize);

        if (successCount == files.size()) {
            task.setStatus(TASK_STATUS_COMPLETED);
            task.setCompletedAt(LocalDateTime.now());
        }

        task.setUpdatedAt(LocalDateTime.now());
        uploadTaskRepository.save(task);
    }

    private UploadTaskDTO getTaskDTO(UploadTask task) {
        UploadTaskDTO dto = new UploadTaskDTO();
        dto.setTaskId(task.getId());
        dto.setTaskName(task.getTaskName());
        dto.setUserId(task.getUserId());
        dto.setTotalFiles(task.getTotalFiles());
        dto.setTotalSize(task.getTotalSize());
        dto.setStatus(task.getStatus());
        dto.setCreatedAt(task.getCreatedAt());
        return dto;
    }

    private UploadFileDTO convertToDTO(UploadFile file) {
        UploadFileDTO dto = new UploadFileDTO();
        dto.setFileIndex(file.getFileIndex());
        dto.setFileName(file.getFileName());
        dto.setFileSize(file.getFileSize());
        dto.setStatus(file.getStatus());
        dto.setProgress(file.getProgress());
        dto.setImageId(file.getImageId());
        dto.setErrorMsg(file.getErrorMsg());
        if (file.getImageId() != null && !file.getImageId().isBlank()) {
            try {
                ImageAnalysis analysis = imageAnalysisRepository.findTopByImageIdAndAnalysisTypeOrderByCreatedAtDesc(file.getImageId(), "RAG").orElse(null);
                dto.setAnalysisStatus(analysis != null ? analysis.getStatus() : "NONE");
            } catch (Exception e) {
                logger.warn("Failed to get analysis status for imageId={}", file.getImageId());
                dto.setAnalysisStatus("NONE");
            }
        } else {
            dto.setAnalysisStatus("NONE");
        }
        return dto;
    }
}
