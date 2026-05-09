package com.photo.backend.user.service;

import com.photo.backend.common.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new RuntimeException("User is not authenticated");
        }
        return user;
    }

    public Integer getCurrentUserId() {
        return getCurrentUser().getId();
    }
}
