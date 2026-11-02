// manage primary-role assignments.

package com.edward.pensioncompliance.user.repository;

import com.edward.pensioncompliance.user.entity.UserRole;
import com.edward.pensioncompliance.user.entity.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRoleRepository
        extends JpaRepository<UserRole, UserRoleId> {

    Optional<UserRole> findByUser_UserId(Long userId);

    boolean existsByUser_UserId(Long userId);

    boolean existsByRole_RoleCode(String roleCode);
}