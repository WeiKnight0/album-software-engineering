package com.photo.backend.bootstrap;

import com.photo.backend.common.entity.Permission;
import com.photo.backend.common.entity.Role;
import com.photo.backend.common.entity.RolePermission;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.entity.UserRole;
import com.photo.backend.common.repository.PermissionRepository;
import com.photo.backend.common.repository.RolePermissionRepository;
import com.photo.backend.common.repository.RoleRepository;
import com.photo.backend.common.repository.UserRepository;
import com.photo.backend.common.repository.UserRoleRepository;
import com.photo.backend.user.service.RbacService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(name = "app.bootstrap.enabled", havingValue = "true")
public class BootstrapInitializer implements ApplicationRunner {
    private static final String DEFAULT_ADMIN_USERNAME = "superadmin";
    private static final String DEFAULT_ADMIN_PASSWORD = "admin123456";
    private static final String DEFAULT_ADMIN_EMAIL = "superadmin@example.com";
    private static final String DEFAULT_ADMIN_NICKNAME = "Super Admin";
    private static final String DEFAULT_USER_USERNAME = "normaluser";
    private static final String DEFAULT_USER_PASSWORD = "user123456";
    private static final String DEFAULT_USER_EMAIL = "user@example.com";
    private static final String DEFAULT_USER_NICKNAME = "Normal User";

    @Autowired
    private ConfigurableApplicationContext context;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private UserRoleRepository userRoleRepository;
    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public void run(ApplicationArguments args) {
        String adminUsername = env("INIT_ADMIN_USERNAME", DEFAULT_ADMIN_USERNAME);
        String adminPassword = env("INIT_ADMIN_PASSWORD", DEFAULT_ADMIN_PASSWORD);
        String adminEmail = env("INIT_ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL);
        String adminNickname = env("INIT_ADMIN_NICKNAME", DEFAULT_ADMIN_NICKNAME);
        String userUsername = env("INIT_USER_USERNAME", DEFAULT_USER_USERNAME);
        String userPassword = env("INIT_USER_PASSWORD", DEFAULT_USER_PASSWORD);
        String userEmail = env("INIT_USER_EMAIL", DEFAULT_USER_EMAIL);
        String userNickname = env("INIT_USER_NICKNAME", DEFAULT_USER_NICKNAME);

        Role superAdminRole = ensureRole(RbacService.ROLE_SUPER_ADMIN, "超级管理员", "系统最高权限角色");
        Role adminRole = ensureRole(RbacService.ROLE_ADMIN, "管理员", "后台管理角色");
        Role userRole = ensureRole(RbacService.ROLE_USER, "普通用户", "普通相册用户");

        List<Permission> permissions = List.of(
                ensurePermission("user:view", "查看用户", "user"),
                ensurePermission("user:create", "创建用户", "user"),
                ensurePermission("user:update", "更新用户", "user"),
                ensurePermission("role:view", "查看角色", "role"),
                ensurePermission("role:assign", "分配角色", "role"),
                ensurePermission("log:view", "查看日志", "log"),
                ensurePermission("log:export", "导出日志", "log"),
                ensurePermission("task:view", "查看任务", "task"),
                ensurePermission("task:export", "导出任务", "task")
        );

        for (Permission permission : permissions) {
            ensureRolePermission(superAdminRole, permission);
        }
        for (Permission permission : permissions) {
            if (!permission.getCode().equals("role:assign")) {
                ensureRolePermission(adminRole, permission);
            }
        }

        User superAdmin = ensureUser(adminUsername, adminPassword, adminEmail, adminNickname, true);
        ensureUserRole(superAdmin, superAdminRole);

        User normalUser = ensureUser(userUsername, userPassword, userEmail, userNickname, false);
        ensureUserRole(normalUser, userRole);

        System.out.println("=== Bootstrap complete ===");
        System.out.println("super admin: username=" + adminUsername);
        System.out.println("normal user: username=" + userUsername);
        int exitCode = org.springframework.boot.SpringApplication.exit(context, () -> 0);
        System.exit(exitCode);
    }

    private Role ensureRole(String code, String name, String description) {
        return roleRepository.findByCode(code).orElseGet(() -> {
            Role role = new Role();
            role.setCode(code);
            role.setName(name);
            role.setDescription(description);
            role.setStatus(1);
            return roleRepository.save(role);
        });
    }

    private Permission ensurePermission(String code, String name, String module) {
        return permissionRepository.findByCode(code).orElseGet(() -> {
            Permission permission = new Permission();
            permission.setCode(code);
            permission.setName(name);
            permission.setModule(module);
            return permissionRepository.save(permission);
        });
    }

    private void ensureRolePermission(Role role, Permission permission) {
        if (!rolePermissionRepository.existsByRoleIdAndPermissionId(role.getId(), permission.getId())) {
            RolePermission rolePermission = new RolePermission();
            rolePermission.setRoleId(role.getId());
            rolePermission.setPermissionId(permission.getId());
            rolePermissionRepository.save(rolePermission);
        }
    }

    private User ensureUser(String username, String password, String email, String nickname, boolean isSuperAdmin) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("username cannot be blank");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("password cannot be blank");
        }
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("email cannot be blank");
        }
        return userRepository.findByUsername(username).orElseGet(() -> {
            User user = new User();
            user.setUsername(username);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setEmail(email);
            user.setNickname(nickname);
            user.setStatus(1);
            user.setIsMember(false);
            user.setStorageLimit(1073741824L);
            user.setIsSuperAdmin(isSuperAdmin);
            return userRepository.save(user);
        });
    }

    private void ensureUserRole(User user, Role role) {
        if (!userRoleRepository.existsByUserIdAndRoleId(user.getId(), role.getId())) {
            UserRole userRole = new UserRole();
            userRole.setUserId(user.getId());
            userRole.setRoleId(role.getId());
            userRoleRepository.save(userRole);
        }
    }

    private String env(String name, String defaultValue) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }
}
