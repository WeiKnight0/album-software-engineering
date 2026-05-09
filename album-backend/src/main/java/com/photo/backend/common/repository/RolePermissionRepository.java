package com.photo.backend.common.repository;

import com.photo.backend.common.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RolePermissionRepository extends JpaRepository<RolePermission, Integer> {
    List<RolePermission> findByRoleId(Integer roleId);
    void deleteByRoleId(Integer roleId);
    Optional<RolePermission> findByRoleIdAndPermissionId(Integer roleId, Integer permissionId);
    boolean existsByRoleIdAndPermissionId(Integer roleId, Integer permissionId);
}
