package com.edward.pensioncompliance.role.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "app_role")
public class AppRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Long roleId;

    @Column(name = "role_code", nullable = false, unique = true, length = 50)
    private String roleCode;

    @Column(name = "role_name", nullable = false, length = 100)
    private String roleName;

    @Column(name = "description")
    private String description;

    @Column(name = "is_system_role", nullable = false)
    private boolean systemRole;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected AppRole() {
        // Required by JPA
    }

    public Long getRoleId() {
        return roleId;
    }

    public String getRoleCode() {
        return roleCode;
    }

    public String getRoleName() {
        return roleName;
    }

    public String getDescription() {
        return description;
    }

    public boolean isSystemRole() {
        return systemRole;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}