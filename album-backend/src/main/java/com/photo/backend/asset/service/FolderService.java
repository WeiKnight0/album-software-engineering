package com.photo.backend.asset.service;

import com.photo.backend.common.entity.Folder;
import com.photo.backend.common.repository.FolderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class FolderService {
    @Autowired
    private FolderRepository folderRepository;

    public Folder createFolder(Integer userId, Integer parentId, String name) {
        if (folderRepository.existsByUserIdAndParentIdAndName(userId, parentId, name)) {
            throw new RuntimeException("Folder name already exists");
        }

        Folder folder = new Folder();
        folder.setUserId(userId);
        folder.setParentId(parentId);
        folder.setName(name);
        folder.setIsInRecycleBin(false);
        folder.setCreatedAt(LocalDateTime.now());
        folder.setUpdatedAt(LocalDateTime.now());

        return folderRepository.save(folder);
    }

    public Folder renameFolder(Integer folderId, Integer userId, String newName) {
        Optional<Folder> folderOptional = folderRepository.findById(folderId);
        if (!folderOptional.isPresent()) {
            throw new RuntimeException("Folder not found");
        }

        Folder folder = folderOptional.get();

        if (!folder.getUserId().equals(userId)) {
            throw new RuntimeException("Permission denied");
        }

        if (folderRepository.existsByUserIdAndParentIdAndName(userId, folder.getParentId(), newName)) {
            throw new RuntimeException("Folder name already exists");
        }

        folder.setName(newName);
        folder.setUpdatedAt(LocalDateTime.now());

        return folderRepository.save(folder);
    }

    public void deleteFolder(Integer folderId, Integer userId) {
        Optional<Folder> folderOptional = folderRepository.findById(folderId);
        if (!folderOptional.isPresent()) {
            throw new RuntimeException("Folder not found");
        }

        Folder folder = folderOptional.get();

        if (!folder.getUserId().equals(userId)) {
            throw new RuntimeException("Permission denied");
        }

        folder.setIsInRecycleBin(true);
        folder.setOriginalParentId(folder.getParentId());
        folder.setParentId(null);
        folder.setMovedToBinAt(LocalDateTime.now());
        folder.setUpdatedAt(LocalDateTime.now());

        folderRepository.save(folder);
    }

    public void restoreFolder(Integer folderId, Integer userId) {
        Optional<Folder> folderOptional = folderRepository.findById(folderId);
        if (!folderOptional.isPresent()) {
            throw new RuntimeException("Folder not found");
        }

        Folder folder = folderOptional.get();

        if (!folder.getUserId().equals(userId)) {
            throw new RuntimeException("Permission denied");
        }

        if (!folder.getIsInRecycleBin()) {
            throw new RuntimeException("Folder is not in recycle bin");
        }

        folder.setIsInRecycleBin(false);
        folder.setParentId(folder.getOriginalParentId());
        folder.setOriginalParentId(null);
        folder.setMovedToBinAt(null);
        folder.setUpdatedAt(LocalDateTime.now());

        folderRepository.save(folder);
    }

    public List<Folder> getFoldersByParentId(Integer userId, Integer parentId) {
        return folderRepository.findByUserIdAndParentId(userId, parentId);
    }

    public List<Folder> getRecycleBinFolders(Integer userId) {
        return folderRepository.findByUserIdAndIsInRecycleBin(userId, true);
    }

    public Folder getFolderById(Integer folderId, Integer userId) {
        Optional<Folder> folderOptional = folderRepository.findById(folderId);
        if (!folderOptional.isPresent()) {
            throw new RuntimeException("Folder not found");
        }

        Folder folder = folderOptional.get();

        if (!folder.getUserId().equals(userId)) {
            throw new RuntimeException("Permission denied");
        }

        return folder;
    }

    public void updateCoverImage(Integer folderId, Integer userId, String imageId) {
        Folder folder = getFolderById(folderId, userId);
        folder.setCoverImageId(imageId);
        folder.setUpdatedAt(LocalDateTime.now());
        folderRepository.save(folder);
    }
}
