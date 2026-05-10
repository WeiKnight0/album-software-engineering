package com.photo.backend.common.repository;

import com.photo.backend.common.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserPermissionRepository extends JpaRepository<UserPermission, Integer> {
    List<UserPermission> findByUserId(Integer userId);
    void deleteByUserId(Integer userId);
    boolean existsByUserIdAndPermissionId(Integer userId, Integer permissionId);
}
