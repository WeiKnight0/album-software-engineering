package com.photo.backend.user.service;

import com.photo.backend.common.entity.Permission;
import com.photo.backend.common.entity.Role;
import com.photo.backend.common.entity.RolePermission;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.entity.UserRole;
import com.photo.backend.common.repository.PermissionRepository;
import com.photo.backend.common.repository.RolePermissionRepository;
import com.photo.backend.common.repository.RoleRepository;
import com.photo.backend.common.repository.UserRoleRepository;
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
    private RolePermissionRepository rolePermissionRepository;

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
        Set<String> permissions = new HashSet<>();
        for (UserRole userRole : userRoleRepository.findByUserId(userId)) {
            roleRepository.findById(userRole.getRoleId())
                    .filter(role -> role.getStatus() == null || role.getStatus() == 1)
                    .ifPresent(role -> {
                        for (RolePermission rolePermission : rolePermissionRepository.findByRoleId(role.getId())) {
                            permissionRepository.findById(rolePermission.getPermissionId())
                                    .map(Permission::getCode)
                                    .ifPresent(permissions::add);
                        }
                    });
        }
        return permissions.stream().sorted().toList();
    }

    public List<String> getPermissionCodesByRole(Integer roleId) {
        List<String> permissions = new ArrayList<>();
        for (RolePermission rolePermission : rolePermissionRepository.findByRoleId(roleId)) {
            permissionRepository.findById(rolePermission.getPermissionId())
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

    @Transactional
    public void replaceUserRoles(Integer userId, List<String> roleCodes) {
        userRoleRepository.deleteByUserId(userId);
        for (String roleCode : roleCodes) {
            assignRole(userId, roleCode);
        }
    }

    @Transactional
    public void replaceRolePermissions(Integer roleId, List<String> permissionCodes) {
        rolePermissionRepository.deleteByRoleId(roleId);
        for (String permissionCode : permissionCodes) {
            Permission permission = permissionRepository.findByCode(permissionCode)
                    .orElseThrow(() -> new RuntimeException("Permission not found: " + permissionCode));
            RolePermission rolePermission = new RolePermission();
            rolePermission.setRoleId(roleId);
            rolePermission.setPermissionId(permission.getId());
            rolePermissionRepository.save(rolePermission);
        }
    }

}
