package com.photo.backend.common.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "role_permission", uniqueConstraints = {
    @UniqueConstraint(name = "uk_role_permission", columnNames = {"role_id", "permission_id"})
})
public class RolePermission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_permission_id")
    private Integer id;

    @Column(name = "role_id", nullable = false)
    private Integer roleId;

    @Column(name = "permission_id", nullable = false)
    private Integer permissionId;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getRoleId() { return roleId; }
    public void setRoleId(Integer roleId) { this.roleId = roleId; }
    public Integer getPermissionId() { return permissionId; }
    public void setPermissionId(Integer permissionId) { this.permissionId = permissionId; }
}
