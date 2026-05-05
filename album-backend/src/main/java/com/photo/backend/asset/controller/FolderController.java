package com.photo.backend.asset.controller;

import com.photo.backend.common.dto.ApiResponse;
import com.photo.backend.common.entity.Folder;
import com.photo.backend.asset.service.FolderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/folders")
public class FolderController {
    @Autowired
    private FolderService folderService;

    @PostMapping
    public ResponseEntity<ApiResponse<Folder>> createFolder(@RequestBody Map<String, Object> request) {
        try {
            Integer userId = (Integer) request.get("userId");
            Integer parentId = (Integer) request.get("parentId");
            String name = (String) request.get("name");

            Folder folder = folderService.createFolder(userId, parentId, name);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(folder, "文件夹创建成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("创建失败: " + e.getMessage(), "CREATE_FAILED"));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Folder>>> getFolders(
            @RequestParam Integer userId,
            @RequestParam(required = false) Integer parentId,
            @RequestParam(required = false, defaultValue = "all") String status) {
        try {
            List<Folder> folders;
            if ("recycle".equals(status)) {
                folders = folderService.getRecycleBinFolders(userId);
            } else if (parentId != null && parentId != 0) {
                folders = folderService.getFoldersByParentId(userId, parentId);
            } else {
                folders = folderService.getFoldersByParentId(userId, null);
            }
            return ResponseEntity.ok(ApiResponse.success(folders));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("获取失败: " + e.getMessage(), "GET_FAILED"));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Folder>> getFolder(@PathVariable Integer id, @RequestParam Integer userId) {
        try {
            Folder folder = folderService.getFolderById(id, userId);
            return ResponseEntity.ok(ApiResponse.success(folder));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Folder>> updateFolder(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> request) {
        try {
            Integer userId = (Integer) request.get("userId");
            String name = (String) request.get("name");

            Folder folder = folderService.renameFolder(id, userId, name);
            return ResponseEntity.ok(ApiResponse.success(folder, "文件夹更新成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("更新失败: " + e.getMessage(), "UPDATE_FAILED"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFolder(@PathVariable Integer id, @RequestParam Integer userId) {
        try {
            folderService.deleteFolder(id, userId);
            return ResponseEntity.ok(ApiResponse.success("文件夹删除成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "DELETE_FAILED"));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> patchFolder(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> request) {
        try {
            Integer userId = (Integer) request.get("userId");
            Boolean restore = (Boolean) request.get("restore");
            String imageId = (String) request.get("imageId");

            if (restore != null && restore) {
                folderService.restoreFolder(id, userId);
                return ResponseEntity.ok(ApiResponse.success("文件夹恢复成功"));
            }

            if (imageId != null) {
                folderService.updateCoverImage(id, userId, imageId);
                return ResponseEntity.ok(ApiResponse.success("封面更新成功"));
            }

            return ResponseEntity.badRequest()
                .body(ApiResponse.error("无效的操作", "INVALID_OPERATION"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), "PATCH_FAILED"));
        }
    }
}
