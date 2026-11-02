package com.edward.pensioncompliance.user.entity;

import com.edward.pensioncompliance.role.entity.AppRole;
import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "user_role",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_user_role_one_primary_role",
            columnNames = "user_id"
        )
    }
)
public class UserRole {

    @EmbeddedId
    private UserRoleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roleId")
    @JoinColumn(name = "role_id", nullable = false)
    private AppRole role;

    @Column(name = "assigned_at", nullable = false)
    private OffsetDateTime assignedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_user_id")
    private AppUser assignedBy;

    protected UserRole() {
        // Required by JPA
    }

    public UserRoleId getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public AppRole getRole() {
        return role;
    }

    public OffsetDateTime getAssignedAt() {
        return assignedAt;
    }

    public AppUser getAssignedBy() {
        return assignedBy;
    }
}