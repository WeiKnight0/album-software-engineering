package com.photo.backend.user.service;

import com.photo.backend.common.entity.RefreshToken;
import com.photo.backend.common.entity.User;
import com.photo.backend.common.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    public String createRefreshToken(User user) {
        String rawToken = newToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hash(rawToken));
        refreshToken.setCreatedAt(LocalDateTime.now());
        refreshToken.setExpiresAt(LocalDateTime.now().plusNanos(refreshExpirationMs * 1_000_000));
        refreshTokenRepository.save(refreshToken);
        return rawToken;
    }

    @Transactional
    public RefreshResult rotate(String rawToken) {
        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));
        LocalDateTime now = LocalDateTime.now();
        if (existing.getRevokedAt() != null || !existing.getExpiresAt().isAfter(now)) {
            throw new RuntimeException("Invalid refresh token");
        }
        User user = existing.getUser();
        if (user.getStatus() == null || user.getStatus() != 1) {
            throw new RuntimeException("Account is disabled");
        }

        String newRawToken = newToken();
        String newHash = hash(newRawToken);
        existing.setRevokedAt(now);
        existing.setReplacedByTokenHash(newHash);

        RefreshToken replacement = new RefreshToken();
        replacement.setUser(user);
        replacement.setTokenHash(newHash);
        replacement.setCreatedAt(now);
        replacement.setExpiresAt(now.plusNanos(refreshExpirationMs * 1_000_000));
        refreshTokenRepository.save(replacement);
        return new RefreshResult(user, newRawToken);
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(hash(rawToken)).ifPresent(refreshToken -> {
            if (refreshToken.getRevokedAt() == null) {
                refreshToken.setRevokedAt(LocalDateTime.now());
            }
        });
    }

    @Transactional
    public void revokeAllForUser(Integer userId) {
        refreshTokenRepository.revokeAllForUser(userId, LocalDateTime.now());
    }

    private String newToken() {
        byte[] bytes = new byte[64];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    public record RefreshResult(User user, String refreshToken) {
    }
}
