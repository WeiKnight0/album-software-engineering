package com.photo.backend.common.repository;

import com.photo.backend.common.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRoleRepository extends JpaRepository<UserRole, Integer> {
    List<UserRole> findByUserId(Integer userId);
    void deleteByUserId(Integer userId);
    Optional<UserRole> findByUserIdAndRoleId(Integer userId, Integer roleId);
    boolean existsByUserIdAndRoleId(Integer userId, Integer roleId);
}
