package com.photo.backend.admin.dto;

import com.photo.backend.common.entity.User;

import java.time.LocalDateTime;
import java.util.List;

public class AdminUserDTO {
    private Integer id;
    private String username;
    private String email;
    private String nickname;
    private Boolean isMember;
    private Boolean isSuperAdmin;
    private LocalDateTime membershipExpireAt;
    private Integer status;
    private Long storageUsed;
    private Long storageLimit;
    private String avatarFilename;
    private List<String> roles;

    public static AdminUserDTO from(User user, List<String> roles) {
        AdminUserDTO dto = new AdminUserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setNickname(user.getNickname());
        dto.setIsMember(user.getIsMember());
        dto.setIsSuperAdmin(Boolean.TRUE.equals(user.getIsSuperAdmin()));
        dto.setMembershipExpireAt(user.getMembershipExpireAt());
        dto.setStatus(user.getStatus());
        dto.setStorageUsed(user.getStorageUsed());
        dto.setStorageLimit(user.getStorageLimit());
        dto.setAvatarFilename(user.getAvatarFilename());
        dto.setRoles(roles);
        return dto;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public Boolean getIsMember() { return isMember; }
    public void setIsMember(Boolean member) { isMember = member; }
    public Boolean getIsSuperAdmin() { return isSuperAdmin; }
    public void setIsSuperAdmin(Boolean superAdmin) { isSuperAdmin = superAdmin; }
    public LocalDateTime getMembershipExpireAt() { return membershipExpireAt; }
    public void setMembershipExpireAt(LocalDateTime membershipExpireAt) { this.membershipExpireAt = membershipExpireAt; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public Long getStorageUsed() { return storageUsed; }
    public void setStorageUsed(Long storageUsed) { this.storageUsed = storageUsed; }
    public Long getStorageLimit() { return storageLimit; }
    public void setStorageLimit(Long storageLimit) { this.storageLimit = storageLimit; }
    public String getAvatarFilename() { return avatarFilename; }
    public void setAvatarFilename(String avatarFilename) { this.avatarFilename = avatarFilename; }
    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }
}
