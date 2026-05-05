package com.photo.backend.asset.service;

import com.photo.backend.common.entity.DownloadFile;
import com.photo.backend.common.entity.DownloadTask;
import com.photo.backend.common.repository.DownloadFileRepository;
import com.photo.backend.common.repository.DownloadTaskRepository;
import com.photo.backend.asset.dto.CreateDownloadTaskRequest;
import com.photo.backend.asset.dto.DownloadFileDTO;
import com.photo.backend.asset.dto.DownloadTaskDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DownloadService {
    private static final Logger logger = LoggerFactory.getLogger(DownloadService.class);

    public static final int TASK_STATUS_WAITING = 1;
    public static final int TASK_STATUS_DOWNLOADING = 2;
    public static final int TASK_STATUS_COMPLETED = 3;
    public static final int TASK_STATUS_PAUSED = 4;
    public static final int TASK_STATUS_CANCELLED = 5;
    public static final int TASK_STATUS_FAILED = 6;

    public static final int FILE_STATUS_WAITING = 1;
    public static final int FILE_STATUS_DOWNLOADING = 2;
    public static final int FILE_STATUS_COMPLETED = 3;
    public static final int FILE_STATUS_FAILED = 4;

    @Autowired
    private DownloadTaskRepository downloadTaskRepository;

    @Autowired
    private DownloadFileRepository downloadFileRepository;

    @Transactional
    public DownloadTaskDTO createTask(CreateDownloadTaskRequest request) {
        String taskId = UUID.randomUUID().toString();

        DownloadTask task = new DownloadTask();
        task.setId(taskId);
        task.setUserId(request.getUserId());
        task.setTaskName(request.getTaskName());
        task.setTotalFiles(request.getImages().size());
        task.setTotalSize(request.getImages().stream()
                .mapToLong(img -> img.getFileSize() != null ? img.getFileSize() : 0)
                .sum());
        task.setDownloadedFiles(0);
        task.setDownloadedSize(0L);
        task.setStatus(TASK_STATUS_WAITING);
        task.setCreatedAt(LocalDateTime.now());

        downloadTaskRepository.save(task);

        for (int i = 0; i < request.getImages().size(); i++) {
            CreateDownloadTaskRequest.ImageInfo imageInfo = request.getImages().get(i);
            DownloadFile downloadFile = new DownloadFile();
            downloadFile.setTaskId(taskId);
            downloadFile.setUserId(request.getUserId());
            downloadFile.setImageId(imageInfo.getImageId());
            downloadFile.setFileName(imageInfo.getFileName());
            downloadFile.setFileSize(imageInfo.getFileSize() != null ? imageInfo.getFileSize() : 0L);
            downloadFile.setFileIndex(i);
            downloadFile.setStatus(FILE_STATUS_WAITING);
            downloadFile.setProgress(0);
            downloadFile.setCreatedAt(LocalDateTime.now());
            downloadFile.setUpdatedAt(LocalDateTime.now());

            downloadFileRepository.save(downloadFile);
        }

        return getTaskDTO(task);
    }

    public List<DownloadTaskDTO> getTasks(Integer userId) {
        List<DownloadTask> tasks = downloadTaskRepository.findByUserId(userId);
        return tasks.stream().map(this::getTaskDTO).collect(Collectors.toList());
    }

    public DownloadTaskDTO getTask(String taskId, Integer userId) {
        DownloadTask task = downloadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        return getTaskDTO(task);
    }

    public List<DownloadFileDTO> getTaskFiles(String taskId, Integer userId) {
        downloadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        List<DownloadFile> files = downloadFileRepository.findByTaskId(taskId);
        return files.stream().map(this::convertToFileDTO).collect(Collectors.toList());
    }

    @Transactional
    public void pauseTask(String taskId, Integer userId) {
        DownloadTask task = downloadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        if (task.getStatus() != TASK_STATUS_DOWNLOADING && task.getStatus() != TASK_STATUS_WAITING) {
            throw new IllegalStateException("任务无法暂停");
        }

        task.setStatus(TASK_STATUS_PAUSED);
        task.setUpdatedAt(LocalDateTime.now());
        downloadTaskRepository.save(task);

        List<DownloadFile> files = downloadFileRepository.findByTaskId(taskId);
        for (DownloadFile file : files) {
            if (file.getStatus() == FILE_STATUS_DOWNLOADING || file.getStatus() == FILE_STATUS_WAITING) {
                file.setStatus(FILE_STATUS_WAITING);
                file.setUpdatedAt(LocalDateTime.now());
                downloadFileRepository.save(file);
            }
        }
    }

    @Transactional
    public void resumeTask(String taskId, Integer userId) {
        DownloadTask task = downloadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        if (task.getStatus() != TASK_STATUS_PAUSED) {
            throw new IllegalStateException("任务不在暂停状态");
        }

        task.setStatus(TASK_STATUS_WAITING);
        task.setUpdatedAt(LocalDateTime.now());
        downloadTaskRepository.save(task);
    }

    @Transactional
    public void cancelTask(String taskId, Integer userId) {
        DownloadTask task = downloadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        task.setStatus(TASK_STATUS_CANCELLED);
        task.setUpdatedAt(LocalDateTime.now());
        downloadTaskRepository.save(task);
    }

    @Transactional
    public void retryTask(String taskId, Integer userId) {
        DownloadTask task = downloadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        if (task.getStatus() != TASK_STATUS_CANCELLED && task.getStatus() != TASK_STATUS_PAUSED 
            && task.getStatus() != TASK_STATUS_FAILED) {
            throw new IllegalStateException("任务无法重试");
        }

        List<DownloadFile> files = downloadFileRepository.findByTaskId(taskId);
        for (DownloadFile file : files) {
            if (file.getStatus() == FILE_STATUS_FAILED) {
                file.setStatus(FILE_STATUS_WAITING);
                file.setProgress(0);
                file.setErrorMsg(null);
                file.setUpdatedAt(LocalDateTime.now());
                downloadFileRepository.save(file);
            }
        }

        task.setStatus(TASK_STATUS_WAITING);
        task.setUpdatedAt(LocalDateTime.now());
        downloadTaskRepository.save(task);
    }

    @Transactional
    public void deleteTask(String taskId, Integer userId) {
        DownloadTask task = downloadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        downloadFileRepository.deleteByTaskId(taskId);
        downloadTaskRepository.delete(task);
    }

    @Transactional
    public void markFileCompleted(String taskId, Integer userId, String imageId) {
        DownloadTask task = downloadTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));

        DownloadFile file = downloadFileRepository.findByTaskIdAndImageId(taskId, imageId)
                .orElseThrow(() -> new IllegalArgumentException("文件不存在"));

        file.setStatus(FILE_STATUS_COMPLETED);
        file.setProgress(100);
        file.setDownloadedAt(LocalDateTime.now());
        file.setUpdatedAt(LocalDateTime.now());
        downloadFileRepository.save(file);

        updateTaskProgress(taskId, userId);
    }

    private void updateTaskProgress(String taskId, Integer userId) {
        DownloadTask task = downloadTaskRepository.findByIdAndUserId(taskId, userId).orElse(null);
        if (task == null) return;

        List<DownloadFile> files = downloadFileRepository.findByTaskId(taskId);
        long completedCount = files.stream().filter(f -> f.getStatus() == FILE_STATUS_COMPLETED).count();
        long completedSize = files.stream()
                .filter(f -> f.getStatus() == FILE_STATUS_COMPLETED)
                .mapToLong(DownloadFile::getFileSize)
                .sum();

        task.setDownloadedFiles((int) completedCount);
        task.setDownloadedSize(completedSize);
        task.setUpdatedAt(LocalDateTime.now());

        if (completedCount == files.size()) {
            task.setStatus(TASK_STATUS_COMPLETED);
            task.setCompletedAt(LocalDateTime.now());
        } else if (task.getStatus() == TASK_STATUS_DOWNLOADING) {
            task.setStatus(TASK_STATUS_WAITING);
        }

        downloadTaskRepository.save(task);
    }

    private DownloadTaskDTO getTaskDTO(DownloadTask task) {
        DownloadTaskDTO dto = new DownloadTaskDTO();
        dto.setTaskId(task.getId());
        dto.setTaskName(task.getTaskName());
        dto.setUserId(task.getUserId());
        dto.setTotalFiles(task.getTotalFiles());
        dto.setTotalSize(task.getTotalSize());
        dto.setStatus(task.getStatus());
        dto.setCreatedAt(task.getCreatedAt());
        dto.setCompletedAt(task.getCompletedAt());
        dto.setDownloadedFiles(task.getDownloadedFiles());
        dto.setDownloadedSize(task.getDownloadedSize());

        int overallProgress = task.getTotalSize() > 0
                ? (int) ((task.getDownloadedSize() * 100) / task.getTotalSize())
                : 0;
        dto.setProgress(overallProgress);

        List<DownloadFileDTO> fileDTOs = downloadFileRepository.findByTaskId(task.getId())
                .stream().map(this::convertToFileDTO).toList();
        dto.setFiles(fileDTOs);

        return dto;
    }

    private DownloadFileDTO convertToFileDTO(DownloadFile file) {
        DownloadFileDTO dto = new DownloadFileDTO();
        dto.setId(file.getId());
        dto.setTaskId(file.getTaskId());
        dto.setImageId(file.getImageId());
        dto.setFileIndex(file.getFileIndex());
        dto.setFileName(file.getFileName());
        dto.setFileSize(file.getFileSize());
        dto.setStatus(file.getStatus());
        dto.setProgress(file.getProgress());
        dto.setErrorMsg(file.getErrorMsg());
        dto.setDownloadedAt(file.getDownloadedAt());
        dto.setCreatedAt(file.getCreatedAt());
        return dto;
    }
}
