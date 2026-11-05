package com.edward.pensioncompliance.user.repository;

import com.edward.pensioncompliance.user.entity.AppUser;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsername(String username);

    Optional<AppUser> findByInstitutionalEmail(String institutionalEmail);

    boolean existsByUsername(String username);

    boolean existsByInstitutionalEmail(String institutionalEmail);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT u
        FROM AppUser u
        WHERE u.username = :identifier
           OR u.institutionalEmail = :identifier
        """)
    Optional<AppUser> findByIdentifierForUpdate(
            @Param("identifier") String identifier
    );
}