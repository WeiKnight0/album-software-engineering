package com.photo.backend.common.repository;

import com.photo.backend.common.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, Integer> {
    List<Folder> findByUserIdAndParentId(Integer userId, Integer parentId);
    List<Folder> findByUserIdAndIsInRecycleBin(Integer userId, Boolean isInRecycleBin);
    Optional<Folder> findByUserIdAndParentIdAndName(Integer userId, Integer parentId, String name);
    boolean existsByUserIdAndParentIdAndName(Integer userId, Integer parentId, String name);
}
