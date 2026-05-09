package com.photo.backend.admin.dto;

import com.photo.backend.common.entity.Role;

import java.util.List;

public class AdminRoleDTO {
    private Integer id;
    private String code;
    private String name;
    private String description;
    private Integer status;
    private List<String> permissions;

    public static AdminRoleDTO from(Role role, List<String> permissions) {
        AdminRoleDTO dto = new AdminRoleDTO();
        dto.setId(role.getId());
        dto.setCode(role.getCode());
        dto.setName(role.getName());
        dto.setDescription(role.getDescription());
        dto.setStatus(role.getStatus());
        dto.setPermissions(permissions);
        return dto;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }
}
