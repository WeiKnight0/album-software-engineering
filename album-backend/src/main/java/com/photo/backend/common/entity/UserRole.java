package com.photo.backend.common.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user_role", uniqueConstraints = {
    @UniqueConstraint(name = "uk_user_role", columnNames = {"user_id", "role_id"})
})
public class UserRole {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_role_id")
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "role_id", nullable = false)
    private Integer roleId;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public Integer getRoleId() { return roleId; }
    public void setRoleId(Integer roleId) { this.roleId = roleId; }
}
