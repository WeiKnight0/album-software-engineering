package com.photo.backend.common.repository;

import com.photo.backend.common.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByCode(String code);
    boolean existsByCode(String code);
}
