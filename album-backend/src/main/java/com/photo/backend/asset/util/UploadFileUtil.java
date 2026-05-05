package com.photo.backend.asset.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

@Component
public class UploadFileUtil {

    @Value("${upload.base-path:uploads}")
    private String basePath;

    @Value("${upload.temp-path:uploads/temp}")
    private String tempPath;

    public String getTempDirectory(String taskId) {
        return tempPath + "/" + taskId;
    }

    public String getFinalDirectory(Integer userId) {
        return basePath + "/" + userId;
    }

    public String saveTempFile(MultipartFile file, String taskId, Integer chunkIndex) throws IOException {
        String tempDir = getTempDirectory(taskId);
        Path dirPath = Paths.get(tempDir);
        if (!Files.exists(dirPath)) {
            Files.createDirectories(dirPath);
        }

        String filename = chunkIndex + "_" + file.getOriginalFilename();
        Path filePath = dirPath.resolve(filename);
        file.transferTo(filePath.toFile());

        return filePath.toString();
    }

    public String saveTempFileComplete(MultipartFile file, String taskId, String fileName) throws IOException {
        String tempDir = getTempDirectory(taskId);
        Path dirPath = Paths.get(tempDir);
        if (!Files.exists(dirPath)) {
            Files.createDirectories(dirPath);
        }

        String uniqueFileName = UUID.randomUUID().toString() + "_" + fileName;
        Path filePath = dirPath.resolve(uniqueFileName);
        file.transferTo(filePath.toFile());

        return filePath.toString();
    }

    public String moveToFinal(String tempFilePath, Integer userId, String fileName) throws IOException {
        String finalDir = getFinalDirectory(userId);
        Path dirPath = Paths.get(finalDir);
        if (!Files.exists(dirPath)) {
            Files.createDirectories(dirPath);
        }

        String uniqueFileName = UUID.randomUUID().toString() + "_" + fileName;
        Path finalPath = dirPath.resolve(uniqueFileName);

        Files.move(Paths.get(tempFilePath), finalPath);

        return finalPath.toString();
    }

    public void deleteTempDirectory(String taskId) {
        try {
            Path tempDir = Paths.get(getTempDirectory(taskId));
            if (Files.exists(tempDir)) {
                Files.walk(tempDir)
                    .sorted((a, b) -> b.compareTo(a))
                    .forEach(path -> {
                        try {
                            Files.delete(path);
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    });
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void deleteTempFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (Files.exists(path)) {
                Files.delete(path);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public String calculateFileHash(MultipartFile file) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(file.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException | IOException e) {
            return UUID.randomUUID().toString();
        }
    }

    public String getFileExtension(String filename) {
        if (filename == null) return "";
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot) : "";
    }
}
