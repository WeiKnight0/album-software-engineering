package com.photo.backend.user.service;

import com.photo.backend.common.entity.Permission;
import com.photo.backend.common.entity.Role;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.entity.UserPermission;
import com.photo.backend.common.entity.UserRole;
import com.photo.backend.common.repository.PermissionRepository;
import com.photo.backend.common.repository.RoleRepository;
import com.photo.backend.common.repository.UserRoleRepository;
import com.photo.backend.common.repository.UserPermissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class RbacService {
    public static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_USER = "USER";

    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private UserRoleRepository userRoleRepository;
    @Autowired
    private UserPermissionRepository userPermissionRepository;

    public List<String> getRoleCodes(Integer userId) {
        List<String> roles = new ArrayList<>();
        for (UserRole userRole : userRoleRepository.findByUserId(userId)) {
            roleRepository.findById(userRole.getRoleId())
                    .filter(role -> role.getStatus() == null || role.getStatus() == 1)
                    .map(Role::getCode)
                    .ifPresent(roles::add);
        }
        return roles;
    }

    public List<String> getPermissionCodes(Integer userId) {
        if (hasRole(userId, ROLE_SUPER_ADMIN)) {
            return permissionRepository.findAll().stream().map(Permission::getCode).sorted().toList();
        }
        if (!hasRole(userId, ROLE_ADMIN)) {
            return List.of();
        }
        Set<String> permissions = new HashSet<>();
        for (UserPermission userPermission : userPermissionRepository.findByUserId(userId)) {
            permissionRepository.findById(userPermission.getPermissionId())
                    .map(Permission::getCode)
                    .ifPresent(permissions::add);
        }
        return permissions.stream().sorted().toList();
    }

    public boolean hasRole(Integer userId, String roleCode) {
        return getRoleCodes(userId).contains(roleCode);
    }

    public boolean hasPermission(Integer userId, String permissionCode) {
        return getPermissionCodes(userId).contains(permissionCode);
    }

    public List<String> getDefaultAdminPermissionCodes() {
        return List.of(
                "user:view",
                "user:create",
                "user:update",
                "role:view",
                "log:view",
                "log:export",
                "task:view",
                "task:export"
        );
    }

    public boolean isAdmin(User user) {
        return Boolean.TRUE.equals(user.getIsSuperAdmin())
                || hasRole(user.getId(), ROLE_SUPER_ADMIN)
                || hasRole(user.getId(), ROLE_ADMIN);
    }

    public void requireAdmin(User user) {
        if (!isAdmin(user)) {
            throw new RuntimeException("Admin permission required");
        }
    }

    public void requirePermission(User user, String permissionCode) {
        if (Boolean.TRUE.equals(user.getIsSuperAdmin())) return;
        if (!hasPermission(user.getId(), permissionCode)) {
            throw new RuntimeException("Permission required: " + permissionCode);
        }
    }

    public void requireSuperAdmin(User user) {
        if (!Boolean.TRUE.equals(user.getIsSuperAdmin()) && !hasRole(user.getId(), ROLE_SUPER_ADMIN)) {
            throw new RuntimeException("Super admin permission required");
        }
    }

    @Transactional
    public void assignRole(Integer userId, String roleCode) {
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleCode));
        if (!userRoleRepository.existsByUserIdAndRoleId(userId, role.getId())) {
            UserRole userRole = new UserRole();
            userRole.setUserId(userId);
            userRole.setRoleId(role.getId());
            userRoleRepository.save(userRole);
        }
    }

    public List<String> getUserPermissionCodes(Integer userId) {
        return getPermissionCodes(userId);
    }

    @Transactional
    public void replaceUserPermissions(Integer userId, List<String> permissionCodes) {
        if (!hasRole(userId, ROLE_ADMIN)) {
            throw new RuntimeException("只能为管理员分配权限");
        }
        if (hasRole(userId, ROLE_SUPER_ADMIN)) {
            throw new RuntimeException("超级管理员拥有全部权限，无需分配");
        }
        userPermissionRepository.deleteByUserId(userId);
        for (String permissionCode : permissionCodes) {
            Permission permission = permissionRepository.findByCode(permissionCode)
                    .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionCode));
            if (!userPermissionRepository.existsByUserIdAndPermissionId(userId, permission.getId())) {
                UserPermission userPermission = new UserPermission();
                userPermission.setUserId(userId);
                userPermission.setPermissionId(permission.getId());
                userPermissionRepository.save(userPermission);
            }
        }
    }

}
