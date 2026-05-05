package com.photo.backend;

import com.photo.backend.asset.service.FolderService;
import com.photo.backend.asset.service.ImageService;
import com.photo.backend.asset.service.UploadService;
import com.photo.backend.common.entity.Folder;
import com.photo.backend.common.entity.Image;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.repository.UserRepository;
import com.photo.backend.util.FileMultipartFile;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.time.LocalDateTime;

@SpringBootApplication
public class PhotoApplication {
    public static void main(String[] args) {
        SpringApplication.run(PhotoApplication.class, args);
    }

    @Bean
    public CommandLineRunner initUser(UserRepository userRepository, ImageService imageService, FolderService folderService, UploadService uploadService) {
        return args -> {
            if (userRepository.count() == 0) {
                User user = new User();
                user.setUsername("testuser");
                user.setEmail("test@test.com");
                user.setNickname("Test User");
                user.setPasswordHash(new BCryptPasswordEncoder().encode("test123"));
                user.setStatus(1);
                user.setStorageLimit(1073741824L);
                user.setIsMember(true);
                user.setMembershipExpireAt(LocalDateTime.now().plusYears(1));
                User savedUser = userRepository.save(user);
                System.out.println("=== Initial test user created: username=testuser, password=test123, member=true ===");

                // Auto-import sample images from test_data
                File testDataDir = new File("test_data");
                if (testDataDir.exists() && testDataDir.isDirectory()) {
                    File[] subDirs = testDataDir.listFiles(File::isDirectory);
                    if (subDirs != null) {
                        for (File subDir : subDirs) {
                            String folderName = subDir.getName();
                            Folder folder = folderService.createFolder(savedUser.getId(), null, folderName);
                            System.out.println("Created folder: " + folderName + " (id=" + folder.getId() + ")");

                            File[] images = subDir.listFiles(f -> {
                                String n = f.getName().toLowerCase();
                                return n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png") || n.endsWith(".gif");
                            });

                            if (images != null) {
                                for (File imgFile : images) {
                                    String contentType = determineContentType(imgFile.getName());
                                    MultipartFile multipartFile = new FileMultipartFile(
                                            imgFile, "file", imgFile.getName(), contentType);
                                    try {
                                        Image savedImage = imageService.uploadImage(multipartFile, savedUser.getId(), folder.getId());
                                        // Record upload history
                                        uploadService.recordSimpleUpload(savedImage.getId(), savedUser.getId(), savedImage.getOriginalFilename(), (long) savedImage.getFileSize());
                                        System.out.println("Uploaded and recorded: " + folderName + "/" + imgFile.getName());
                                    } catch (Exception e) {
                                        System.err.println("Failed to upload " + folderName + "/" + imgFile.getName() + ": " + e.getMessage());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
    }

    private static String determineContentType(String filename) {
        String n = filename.toLowerCase();
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
    }
}
