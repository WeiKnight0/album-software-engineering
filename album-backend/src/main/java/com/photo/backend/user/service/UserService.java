package com.photo.backend.user.service;

import com.photo.backend.common.entity.User;
import com.photo.backend.common.repository.UserRepository;
import com.photo.backend.user.dto.CurrentUserDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RbacService rbacService;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final String JWT_SECRET = "your-very-secret-key-for-jwt-token-generation-must-be-long-enough";
    private final long JWT_EXPIRATION = 86400000;

    public User register(User user) {
        logger.info("Registering user: {}", user.getUsername());

        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        String encodedPassword = passwordEncoder.encode(user.getPasswordHash());
        logger.info("Password hash: {}", encodedPassword);
        logger.debug("Encoded password length: {}", encodedPassword.length());
        user.setPasswordHash(encodedPassword);

        user.setIsSuperAdmin(false);
        user.setIsMember(false);
        User savedUser = userRepository.save(user);
        rbacService.assignRole(savedUser.getId(), RbacService.ROLE_USER);
        return savedUser;
    }

    public User createUser(String username, String password, String email, String nickname, boolean isAdmin, boolean isSuperAdmin) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setEmail(email);
        user.setNickname(nickname != null ? nickname : "");
        user.setStatus(1);
        user.setIsMember(false);
        user.setStorageLimit(1073741824L);
        user.setIsSuperAdmin(isSuperAdmin);
        User savedUser = userRepository.save(user);
        rbacService.assignRole(savedUser.getId(), isSuperAdmin ? RbacService.ROLE_SUPER_ADMIN : (isAdmin ? RbacService.ROLE_ADMIN : RbacService.ROLE_USER));
        return savedUser;
    }

    public String login(String username, String password) {
        logger.info("Login attempt for user: {}", username);

        Optional<User> userOptional = userRepository.findByUsername(username);
        if (!userOptional.isPresent()) {
            logger.warn("User not found: {}", username);
            throw new RuntimeException("Invalid username or password");
        }

        User user = userOptional.get();
        logger.debug("User found, id: {}, status: {}", user.getId(), user.getStatus());

        logger.debug("Stored password hash: {}", user.getPasswordHash().substring(0, Math.min(10, user.getPasswordHash().length())));

        boolean matches = passwordEncoder.matches(password, user.getPasswordHash());
        logger.debug("Password match result: {}", matches);

        if (!matches) {
            logger.warn("Password mismatch for user: {}", username);
            throw new RuntimeException("Invalid username or password");
        }

        if (user.getStatus() != 1) {
            logger.warn("User account disabled: {}", username);
            throw new RuntimeException("Account is disabled");
        }

        String token = generateToken(user);
        logger.info("Login successful for user: {}", username);
        return token;
    }

    public User updateUser(Integer userId, User updatedUser) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (!userOptional.isPresent()) {
            throw new RuntimeException("User not found");
        }

        User user = userOptional.get();

        if (updatedUser.getEmail() != null) {
            user.setEmail(updatedUser.getEmail());
        }
        if (updatedUser.getNickname() != null) {
            user.setNickname(updatedUser.getNickname());
        }
        if (updatedUser.getPasswordHash() != null) {
            user.setPasswordHash(passwordEncoder.encode(updatedUser.getPasswordHash()));
        }

        return userRepository.save(user);
    }

    public User getUserById(Integer userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        if (!userOptional.isPresent()) {
            throw new RuntimeException("User not found");
        }
        return userOptional.get();
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserFromAuthHeader(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Missing token");
        }
        Integer userId = getUserIdFromToken(authHeader.substring(7));
        User user = getUserById(userId);
        if (user.getStatus() != null && user.getStatus() != 1) {
            throw new RuntimeException("Account is disabled");
        }
        return user;
    }

    public CurrentUserDTO getCurrentUserDTO(User user) {
        return CurrentUserDTO.from(user, rbacService.getRoleCodes(user.getId()), rbacService.getPermissionCodes(user.getId()));
    }

    public User updateUserStatus(Integer userId, Integer status) {
        User user = getUserById(userId);
        user.setStatus(status);
        return userRepository.save(user);
    }

    public User updateMembership(Integer userId, Boolean isMember, java.time.LocalDateTime expireAt) {
        User user = getUserById(userId);
        user.setIsMember(Boolean.TRUE.equals(isMember));
        user.setMembershipExpireAt(Boolean.TRUE.equals(isMember) ? expireAt : null);
        if (Boolean.TRUE.equals(isMember)) {
            user.setStorageLimit(50L * 1024 * 1024 * 1024);
        }
        return userRepository.save(user);
    }

    public User updateStorageLimit(Integer userId, Long storageLimit) {
        User user = getUserById(userId);
        user.setStorageLimit(storageLimit);
        return userRepository.save(user);
    }

    public void updateStorageUsed(Integer userId, long additionalSize) {
        User user = getUserById(userId);
        user.setStorageUsed(user.getStorageUsed() + additionalSize);
        userRepository.save(user);
    }

    public void decreaseStorageUsed(Integer userId, long size) {
        User user = getUserById(userId);
        long newStorageUsed = user.getStorageUsed() - size;
        user.setStorageUsed(newStorageUsed > 0 ? newStorageUsed : 0);
        userRepository.save(user);
    }

    public boolean checkStorageLimit(Integer userId, long fileSize) {
        User user = getUserById(userId);
        return user.getStorageUsed() + fileSize <= user.getStorageLimit();
    }

    // [新增] 开通会员：更新会员状态、过期时间和存储配额
    public void activateMembership(Integer userId, java.time.LocalDateTime expireAt) {
        User user = getUserById(userId);
        user.setIsMember(true);
        user.setMembershipExpireAt(expireAt);
        user.setStorageLimit(50L * 1024 * 1024 * 1024); // 会员存储空间：50GB
        userRepository.save(user);
    }

    // [新增] 从 JWT Token 中解析用户ID
    public Integer getUserIdFromToken(String token) {
        try {
            var parsedToken = Jwts.parser()
                    .verifyWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes()))
                    .build()
                    .parseSignedClaims(token);
            String subject = parsedToken.getPayload().getSubject();
            return Integer.parseInt(subject);
        } catch (Exception e) {
            throw new RuntimeException("Invalid token");
        }
    }

    private String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + JWT_EXPIRATION);

        return Jwts.builder()
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes()))
                .compact();
    }
}
