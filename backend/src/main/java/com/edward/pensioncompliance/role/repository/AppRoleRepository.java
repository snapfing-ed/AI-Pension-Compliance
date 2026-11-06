// retrieve roles by role code.

package com.edward.pensioncompliance.role.repository;

import com.edward.pensioncompliance.role.entity.AppRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppRoleRepository extends JpaRepository<AppRole, Long> {

    Optional<AppRole> findByRoleCode(String roleCode);

    boolean existsByRoleCode(String roleCode);
}